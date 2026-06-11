import { Injectable, ApplicationRef, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, concat, interval, first } from 'rxjs';

/**
 * Serviço responsável por detectar e aplicar atualizações do PWA.
 *
 * Estratégia (atualização obrigatória, porém não disruptiva):
 *  - Verifica novas versões periodicamente e quando o app volta ao foco.
 *  - Ao encontrar uma nova versão, NÃO recarrega no meio do uso. Apenas
 *    marca que há uma atualização pendente.
 *  - A atualização é aplicada (recarrega a página) somente quando o usuário
 *    volta para o app (retorno ao primeiro plano), momento em que ninguém
 *    está digitando, evitando perda de dados de formulários.
 *  - Se o app entrar em estado irrecuperável (cache corrompido), recarrega.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);

  // Intervalo entre as checagens automáticas de atualização (6 horas).
  private readonly intervaloChecagem = 6 * 60 * 60 * 1000;

  // Indica que uma nova versão já foi baixada e está aguardando para ser
  // aplicada no próximo momento seguro (retorno ao app).
  private atualizacaoPendente = false;

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.agendarChecagens();
    this.ouvirNovasVersoes();
    this.ouvirFalhasIrrecuperaveis();
    this.aplicarAoVoltarParaOApp();
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
        // Nova versão pronta: marca como pendente, sem recarregar agora.
        // Será aplicada quando o usuário voltar ao app.
        this.atualizacaoPendente = true;
      });
  }

  private ouvirFalhasIrrecuperaveis(): void {
    this.swUpdate.unrecoverable.subscribe(() => {
      // Estado irrecuperável: recarrega automaticamente para restaurar o app.
      document.location.reload();
    });
  }

  /**
   * Quando o usuário volta para o app (reabre o PWA na tela de início):
   *  - Se já existe uma atualização pendente, aplica e recarrega agora.
   *  - Caso contrário, dispara uma checagem para a próxima vez.
   */
  private aplicarAoVoltarParaOApp(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (this.atualizacaoPendente) {
        this.swUpdate.activateUpdate().then(() => document.location.reload());
      } else {
        this.swUpdate.checkForUpdate().catch(() => {});
      }
    });
  }

  /**
   * Atualização manual (acionada por um botão). Garante que o app pegue a
   * versão mais recente mesmo quando a atualização automática não ocorre:
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
