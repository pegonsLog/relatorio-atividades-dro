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

  protected readonly title = signal('Sistema de Relatório de Atividades - DRO');
  protected readonly isMenuOpen = signal(true);

  ngOnInit() {
    // Garantir que o menu sempre inicie aberto
    this.isMenuOpen.set(true);

    // Inicia a verificação de atualizações do PWA
    this.pwaUpdate.init();
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }
}
