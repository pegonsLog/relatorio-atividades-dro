import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MaterialModule } from './shared/material.module';
import { CommonModule } from '@angular/common';
import { Menu } from './componentes/menu/menu';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MaterialModule, CommonModule, Menu],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Sistema de Relatório DRO');
  protected readonly isMenuOpen = signal(true);

  ngOnInit() {
    // Garantir que o menu sempre inicie aberto
    this.isMenuOpen.set(true);
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }
}
