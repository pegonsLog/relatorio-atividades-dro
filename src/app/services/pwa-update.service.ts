import { Injectable, ApplicationRef, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, concat, interval, first } from 'rxjs';

/**
 * Serviço responsável por detectar e aplicar atualizações do PWA.
 *
 * Estratégia:
 *  - Verifica novas versões periodicamente e quando o app volta ao foco.
 *  - Ao encontrar uma nova versão, exibe um aviso (sinal `atualizacaoDisponivel`)
 *    para que a UI mostre uma mensagem com botão "Atualizar agora".
 *  - A atualização só é aplicada quando o usuário confirma (clica em atualizar),
 *    evitando recarregar no meio de um cadastro.
 *  - Se o app entrar em estado irrecuperável (cache corrompido), recarrega.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);

  // Intervalo entre as checagens automáticas de atualização (6 horas).
  private readonly intervaloChecagem = 6 * 60 * 60 * 1000;

  // Sinaliza para a UI que há uma nova versão disponível para atualizar.
  readonly atualizacaoDisponivel = signal(false);

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.agendarChecagens();
    this.ouvirNovasVersoes();
    this.ouvirFalhasIrrecuperaveis();
    this.checarAoVoltarParaOApp();
  }

  /**
   * Checa por atualizações periodicamente, mas só depois que o app
   * estabilizar (evita concorrer com o bootstrap inicial).
   */
  private agendarChecagens(): void {
    const appEstavel$ = this.appRef.isStable.pipe(first((estavel) => estavel));
    const checagemPeriodica$ = interval(this.intervaloChecagem);

    concat(appEstavel$, checagemPeriodica$).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {
        // Falha de rede ao checar: ignora e tenta novamente no próximo ciclo.
      });
    });
  }

  private ouvirNovasVersoes(): void {
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        // Nova versão pronta: avisa a UI para exibir a mensagem de atualização.
        this.atualizacaoDisponivel.set(true);
      });
  }

  private ouvirFalhasIrrecuperaveis(): void {
    this.swUpdate.unrecoverable.subscribe(() => {
      // Estado irrecuperável: recarrega automaticamente para restaurar o app.
      document.location.reload();
    });
  }

  /**
   * Quando o usuário volta para o app (reabre o PWA na tela de início),
   * dispara uma checagem imediata de atualização. Se houver nova versão,
   * o evento VERSION_READY ativa o aviso.
   */
  private checarAoVoltarParaOApp(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => {});
      }
    });
  }

  /**
   * Aplica a atualização detectada (acionada pelo botão "Atualizar agora"
   * do aviso): ativa a nova versão do service worker e recarrega.
   */
  async aplicarAtualizacao(): Promise<void> {
    try {
      if (this.swUpdate.isEnabled) {
        await this.swUpdate.activateUpdate().catch(() => {});
      }
    } finally {
      document.location.reload();
    }
  }

  /**
   * Atualização manual (acionada pelo botão "Atualizar App" do menu). Garante
   * que o app pegue a versão mais recente mesmo quando a automática não ocorre:
   *  1. Checa e ativa uma nova versão do service worker, se houver.
   *  2. Limpa os caches do navegador (Cache Storage).
   *  3. Recarrega a página buscando os arquivos novos do servidor.
   */
  async forcarAtualizacao(): Promise<void> {
    try {
      if (this.swUpdate.isEnabled) {
        await this.swUpdate.checkForUpdate().catch(() => {});
        await this.swUpdate.activateUpdate().catch(() => {});
      }

      // Remove todos os caches gerenciados pelo service worker / navegador.
      if ('caches' in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((chave) => caches.delete(chave)));
      }
    } catch {
      // Ignora falhas e força o reload mesmo assim.
    } finally {
      document.location.reload();
    }
  }
}
