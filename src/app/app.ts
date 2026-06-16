import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from './services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly pwaUpdate = inject(PwaUpdateService);

  protected readonly title = signal('Relatório Diário de Atividades - DRO');
  protected readonly isMenuOpen = signal(true);

  // Sinaliza quando há uma nova versão disponível (mostra o aviso).
  protected readonly atualizacaoDisponivel = this.pwaUpdate.atualizacaoDisponivel;
  protected readonly aplicandoAtualizacao = signal(false);

  ngOnInit() {
    // Garantir que o menu sempre inicie aberto
    this.isMenuOpen.set(true);

    // Inicia a verificação de atualizações do PWA
    this.pwaUpdate.init();
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  async aplicarAtualizacao() {
    if (this.aplicandoAtualizacao()) {
      return;
    }
    this.aplicandoAtualizacao.set(true);
    await this.pwaUpdate.aplicarAtualizacao();
  }
}
