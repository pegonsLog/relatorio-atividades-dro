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
  /** Texto reconhecido (parcial ou final) a ser anexado ao campo */
  onText: (text: string, isFinal: boolean) => void;
  /** Reconhecimento encerrado (timeout, parada manual ou fim natural) */
  onEnd: () => void;
  /** Erro durante o reconhecimento */
  onError: (message: string) => void;
}

@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private readonly zone = inject(NgZone);
  private recognition: SpeechRecognitionLike | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private stoppedByUser = false;

  /** Duração máxima da gravação em milissegundos (1 minuto) */
  private readonly MAX_DURATION_MS = 60_000;

  /** Indica se o navegador suporta reconhecimento de voz */
  get isSupported(): boolean {
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  /** Indica se há uma gravação em andamento */
  get isRecording(): boolean {
    return this.recognition !== null;
  }

  /**
   * Inicia o reconhecimento de voz. Encerra automaticamente após 1 minuto.
   * Retorna false se já houver gravação em andamento ou não houver suporte.
   */
  start(callbacks: SpeechCallbacks): boolean {
    if (this.recognition || !this.isSupported) {
      if (!this.isSupported) {
        callbacks.onError('Reconhecimento de voz não suportado neste navegador.');
      }
      return false;
    }

    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    this.stoppedByUser = false;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      this.zone.run(() => {
        if (finalText) {
          callbacks.onText(finalText, true);
        } else if (interim) {
          callbacks.onText(interim, false);
        }
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      this.zone.run(() => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          callbacks.onError(this.mapError(event.error));
        }
      });
    };

    recognition.onend = () => {
      this.clearTimer();
      this.recognition = null;
      this.zone.run(() => callbacks.onEnd());
    };

    this.recognition = recognition;

    try {
      recognition.start();
    } catch (e) {
      this.recognition = null;
      callbacks.onError('Não foi possível iniciar a gravação.');
      return false;
    }

    // Encerra automaticamente após 1 minuto
    this.timeoutId = setTimeout(() => this.stop(), this.MAX_DURATION_MS);
    return true;
  }

  /** Para a gravação manualmente */
  stop(): void {
    this.clearTimer();
    if (this.recognition) {
      this.stoppedByUser = true;
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
    }
  }

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
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
