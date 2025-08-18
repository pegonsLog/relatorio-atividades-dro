import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})
export class Menu {
  protected readonly menuItems = signal<MenuItem[]>([
    {
      icon: 'mdi-file-document',
      label: 'Relatório Base',
      route: '/relatorio-base'
    },
   {
    icon: 'mdi-view-dashboard',
      label: 'Relatórios',
      route: '/relatorios'
    },
    
  ]);

  protected readonly adminItems = signal<MenuItem[]>([
    {
      icon: 'mdi-account',
      label: 'Tabela de Agentes',
      route: '/agente'
    },
    {
      icon: 'mdi-account-group',
      label: 'Tabela de Usuário',
      route: '/usuarios'
    },
    {
      icon: 'mdi-table',
      label: 'Tabela de Atividades',
      route: '/tabela-atividades'
    },
    {
      icon: 'mdi-table-large',
      label: 'Tabela de Produtividade',
      route: '/tabela-produtividade'
    }
  ]);
}
