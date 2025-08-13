import { Component, signal } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-menu',
  imports: [MaterialModule, CommonModule, RouterModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu {
  protected readonly menuItems = signal<MenuItem[]>([
    {
      icon: 'mdi-view-dashboard',
      label: 'Dashboard',
      route: '/dashboard'
    },
    {
      icon: 'mdi-file-document-multiple',
      label: 'Relatórios Base',
      route: '/relatorios',
      badge: 156
    },
    {
      icon: 'mdi-clipboard-check-multiple',
      label: 'Atividades',
      route: '/atividades',
      badge: 1247
    },
    {
      icon: 'mdi-chart-line',
      label: 'Produtividade',
      route: '/produtividade'
    }
  ]);

  protected readonly adminItems = signal<MenuItem[]>([
    {
      icon: 'mdi-cog',
      label: 'Configurações',
      route: '/configuracoes'
    },
    {
      icon: 'mdi-account-group',
      label: 'Usuários',
      route: '/usuarios'
    },
    {
      icon: 'mdi-chart-bar',
      label: 'Relatórios',
      route: '/relatorios-sistema'
    }
  ]);
}
