import { Injectable, NgZone, inject } from '@angular/core';

// Tipagens mínimas para a Web Speech API (não fazem parte do lib.dom padrão)
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number;[index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechCallbacks {
  /**
   * Transcrição da gravação atual. `finalText` é o texto já consolidado
   * (todos os resultados finais) e `interimText` é o trecho ainda em
   * reconhecimento. Ambos representam a gravação inteira, não um delta,
   * então o consumidor deve SUBSTITUIR o conteúdo, nunca somar.
   */
  onText: (finalText: string, interimText: string) => void;
  /** Gravação encerrada (timeout, parada manual ou erro fatal) */
  onEnd: () => void;
  /** Erro durante o reconhecimento */
  onError: (message: string) => void;
}

/**
 * Reconhecimento de voz (Web Speech API) para preencher campos de texto.
 *
 * Sobre a duplicação de palavras no mobile: o modo contínuo
 * (`recognition.continuous = true`) é instável no Android. O motor reinicia
 * internamente e reentrega resultados já finalizados como NOVAS entradas em
 * `event.results`, então qualquer leitura da lista completa acaba somando o
 * mesmo trecho duas vezes. Reconstruir a transcrição a partir do índice 0 não
 * resolve, porque as entradas duplicadas estão dentro da própria lista.
 *
 * A estratégia aqui é não depender do modo contínuo no mobile: usamos sessões
 * curtas (`continuous = false`) e o próprio serviço reabre uma nova sessão
 * quando a anterior termina, consolidando o texto entre elas. Cada sessão
 * começa com `event.results` vazio, o que elimina a reentrega na origem.
 */
@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private readonly zone = inject(NgZone);
  private recognition: SpeechRecognitionLike | null = null;
  private callbacks: SpeechCallbacks | null = null;

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private restartId: ReturnType<typeof setTimeout> | null = null;

  /** Sinaliza que a gravação deve terminar (parada manual, timeout ou erro fatal) */
  private finishing = false;
  /** Texto final consolidado das sessões já encerradas desta gravação */
  private committedText = '';
  /** Texto final da sessão atual, indexado pelo índice do resultado */
  private sessionFinals: string[] = [];

  /** Duração máxima da gravação em milissegundos (1 minuto) */
  private readonly MAX_DURATION_MS = 60_000;
  /** Intervalo entre o fim de uma sessão e a reabertura da próxima */
  private readonly RESTART_DELAY_MS = 250;

  /** Indica se o navegador suporta reconhecimento de voz */
  get isSupported(): boolean {
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  /** Indica se há uma gravação em andamento (inclui o intervalo entre sessões) */
  get isRecording(): boolean {
    return this.recognition !== null || this.restartId !== null;
  }

  /**
   * No Android (e no iOS) o modo contínuo reentrega resultados finalizados e
   * duplica o texto, então usamos sessões curtas reiniciadas manualmente.
   */
  private get useShortSessions(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Inicia o reconhecimento de voz. Encerra automaticamente após 1 minuto.
   * Retorna false se já houver gravação em andamento ou não houver suporte.
   */
  start(callbacks: SpeechCallbacks): boolean {
    if (this.isRecording || !this.isSupported) {
      if (!this.isSupported) {
        callbacks.onError('Reconhecimento de voz não suportado neste navegador.');
      }
      return false;
    }

    this.callbacks = callbacks;
    this.committedText = '';
    this.finishing = false;

    if (!this.openSession()) {
      this.callbacks = null;
      callbacks.onError('Não foi possível iniciar a gravação.');
      return false;
    }

    // Limite total da gravação, independente de quantas sessões forem abertas
    this.timeoutId = setTimeout(() => this.stop(), this.MAX_DURATION_MS);
    return true;
  }

  /** Para a gravação manualmente */
  stop(): void {
    this.finishing = true;
    this.clearTimers();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* o onend cuida do encerramento */
      }
      return;
    }
    // Parada durante o intervalo entre sessões: não há onend para aguardar
    this.finalize();
  }

  /** Abre uma sessão de reconhecimento. Retorna false se não conseguir iniciar. */
  private openSession(): boolean {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.lang = 'pt-BR';
    // No mobile o serviço reinicia as sessões manualmente (ver comentário da classe)
    recognition.continuous = !this.useShortSessions;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    this.sessionFinals = [];

    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => this.handleError(event);
    recognition.onend = () => this.handleEnd();

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.recognition = null;
      return false;
    }
    return true;
  }

  private handleResult(event: SpeechRecognitionEventLike): void {
    let interim = '';
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) {
        // Guardar por índice faz com que a reentrega de um resultado já
        // finalizado sobrescreva a entrada, em vez de somar (duplicar).
        this.sessionFinals[i] = transcript.trim();
      } else {
        // Só o último trecho não-final interessa: os interins são cumulativos,
        // então concatená-los repetiria as mesmas palavras.
        interim = transcript;
      }
    }

    const finalText = this.join(this.committedText, this.currentSessionFinal());
    this.zone.run(() => this.callbacks?.onText(finalText.trim(), interim.trim()));
  }

  private handleError(event: SpeechRecognitionErrorEventLike): void {
    // 'no-speech' e 'aborted' são transitórios: o onend decide se reabre a sessão
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }
    // Erro fatal: impede a reabertura e reporta
    this.finishing = true;
    const callbacks = this.callbacks;
    this.zone.run(() => callbacks?.onError(this.mapError(event.error)));
  }

  private handleEnd(): void {
    this.recognition = null;
    // Consolida o que foi reconhecido nesta sessão antes de descartá-la
    this.committedText = this.join(this.committedText, this.currentSessionFinal()).trim();
    this.sessionFinals = [];

    // Enquanto o usuário não parar e o tempo não expirar, reabre a gravação.
    // A nova sessão começa com a lista de resultados vazia, o que impede a
    // reentrega dos trechos já reconhecidos.
    if (!this.finishing && this.useShortSessions) {
      this.restartId = setTimeout(() => {
        this.restartId = null;
        if (this.finishing || !this.openSession()) {
          this.finalize();
        }
      }, this.RESTART_DELAY_MS);
      return;
    }

    this.finalize();
  }

  /** Encerra a gravação de fato e notifica o consumidor */
  private finalize(): void {
    this.clearTimers();
    this.finishing = true;
    this.recognition = null;
    const callbacks = this.callbacks;
    this.callbacks = null;
    this.zone.run(() => callbacks?.onEnd());
  }

  /** Texto final da sessão atual, ignorando índices sem resultado */
  private currentSessionFinal(): string {
    return this.sessionFinals.filter(Boolean).join(' ');
  }

  /** Concatena dois trechos garantindo um único espaço entre eles */
  private join(left: string, right: string): string {
    if (!left) return right;
    if (!right) return left;
    return /\s$/.test(left) ? left + right : `${left} ${right}`;
  }

  private clearTimers(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.restartId) {
      clearTimeout(this.restartId);
      this.restartId = null;
    }
  }

  private mapError(error: string): string {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Permissão de microfone negada.';
      case 'audio-capture':
        return 'Microfone não encontrado.';
      case 'network':
        return 'Erro de rede no reconhecimento de voz.';
      default:
        return 'Erro ao reconhecer voz.';
    }
  }
}
