import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Sistema de Relatório de Atividades - DRO');
  protected readonly isMenuOpen = signal(true);

  ngOnInit() {
    // Garantir que o menu sempre inicie aberto
    this.isMenuOpen.set(true);
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }
}
