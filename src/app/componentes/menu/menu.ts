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
     icon: 'mdi-format-list-bulleted',
     label: 'Relatório de Atividade',
     route: '/item-atividade'
   },
   {
    icon: 'mdi-format-list-bulleted',
    label: 'Relatório de Produtividade',
    route: '/item-produtividade'
  },
   {
    icon: 'mdi-view-dashboard',
      label: 'Dashboard',
      route: '/dashboard'
    },
    
  ]);

  protected readonly adminItems = signal<MenuItem[]>([
    {
      icon: 'mdi-account',
      label: 'Agente',
      route: '/agente'
    },
    {
      icon: 'mdi-account-group',
      label: 'Usuários',
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
    },
    {
      icon: 'mdi-chart-bar',
      label: 'Relatórios',
      route: '/relatorios-sistema'
    }
  ]);
}
