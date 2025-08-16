import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/menu',
    pathMatch: 'full'
  },
  {
    path: 'menu',
    loadComponent: () => import('./componentes/menu/menu').then(m => m.Menu)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./componentes/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'relatorio-base',
    loadComponent: () => import('./componentes/relatorio-base/relatorio-base-list/relatorio-base-list').then(m => m.RelatorioBaseList)
  },
  {
    path: 'item-atividade',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-list/item-atividade-list').then(m => m.ItemAtividadeList)
  },
  {
    path: 'item-atividade/novo',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-form/item-atividade-form').then(m => m.ItemAtividadeForm)
  },
  {
    path: 'item-atividade/:id/editar',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-form/item-atividade-form').then(m => m.ItemAtividadeForm)
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./componentes/usuarios/usuarios').then(m => m.Usuarios)
  },
  {
    path: 'usuarios/novo',
    loadComponent: () => import('./componentes/usuarios/usuario-form').then(m => m.UsuarioForm)
  },
  {
    path: 'usuarios/:matricula/editar',
    loadComponent: () => import('./componentes/usuarios/usuario-form').then(m => m.UsuarioForm)
  },
  {
    path: 'agente',
    loadComponent: () => import('./componentes/agente/agente').then(m => m.AgenteComponent)
  },
  {
    path: 'tabela-atividades',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividades').then(m => m.TabelaAtividadesComponent)
  },
  {
    path: 'tabela-atividades/novo',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividade-form').then(m => m.TabelaAtividadeForm)
  },
  {
    path: 'tabela-atividades/:codigo/editar',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividade-form').then(m => m.TabelaAtividadeForm)
  },
  {
    path: 'tabela-produtividade',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade').then(m => m.TabelaProdutividadeComponent)
  },
  {
    path: 'tabela-produtividade/novo',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade-form').then(m => m.TabelaProdutividadeForm)
  },
  {
    path: 'tabela-produtividade/:codigo/editar',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade-form').then(m => m.TabelaProdutividadeForm)
  },
  {
    path: 'agente/novo',
    loadComponent: () => import('./componentes/agente/agente-form').then(m => m.AgenteForm)
  },
  {
    path: 'agente/:matricula/editar',
    loadComponent: () => import('./componentes/agente/agente-form').then(m => m.AgenteForm)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
