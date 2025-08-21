import { Routes } from '@angular/router';
import { requireProdContextGuard } from './guards/require-prod-context.guard';
import { requireOcorContextGuard } from './guards/require-ocor-context.guard';
import { requireAuthGuard } from './guards/require-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/menu',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./componentes/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'menu',
    loadComponent: () => import('./componentes/menu/menu').then(m => m.Menu),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./componentes/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'relatorio-base',
    loadComponent: () => import('./componentes/relatorio-base/relatorio-base-list/relatorio-base-list').then(m => m.RelatorioBaseList),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'relatorio-base/:id',
    loadComponent: () => import('./componentes/relatorio-base/relatorio-base-detalhe/relatorio-base-detalhe').then(m => m.RelatorioBaseDetalhe),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'relatorio-base/:id/documento',
    loadComponent: () => import('./componentes/relatorio-base/relatorio-base-documento/relatorio-base-documento').then(m => m.RelatorioBaseDocumento),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-atividade',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-list/item-atividade-list').then(m => m.ItemAtividadeList),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-atividade/novo',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-form/item-atividade-form').then(m => m.ItemAtividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-atividade/:id/editar',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-form/item-atividade-form').then(m => m.ItemAtividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-atividade/:id',
    loadComponent: () => import('./componentes/item-atividade/item-atividade-detalhe/item-atividade-detalhe').then(m => m.ItemAtividadeDetalhe),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-produtividade',
    loadComponent: () => import('./componentes/item-produtividade/item-produtividade-list/item-produtividade-list').then(m => m.ItemProdutividadeList),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-produtividade/novo',
    loadComponent: () => import('./componentes/item-produtividade/item-produtividade-form/item-produtividade-form').then(m => m.ItemProdutividadeForm),
    canActivate: [requireAuthGuard, requireProdContextGuard]
  },
  {
    path: 'item-produtividade/:id/editar',
    loadComponent: () => import('./componentes/item-produtividade/item-produtividade-form/item-produtividade-form').then(m => m.ItemProdutividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-ocorrencia',
    loadComponent: () => import('./componentes/item-ocorrencia/item-ocorrencia-list/item-ocorrencia-list').then(m => m.ItemOcorrenciaList),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'item-ocorrencia/novo',
    loadComponent: () => import('./componentes/item-ocorrencia/item-ocorrencia-form/item-ocorrencia-form').then(m => m.ItemOcorrenciaForm),
    canActivate: [requireAuthGuard, requireOcorContextGuard]
  },
  {
    path: 'item-ocorrencia/:id/editar',
    loadComponent: () => import('./componentes/item-ocorrencia/item-ocorrencia-form/item-ocorrencia-form').then(m => m.ItemOcorrenciaForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./componentes/usuarios/usuarios').then(m => m.Usuarios),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'usuarios/novo',
    loadComponent: () => import('./componentes/usuarios/usuario-form').then(m => m.UsuarioForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'usuarios/:matricula/editar',
    loadComponent: () => import('./componentes/usuarios/usuario-form').then(m => m.UsuarioForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'agente',
    loadComponent: () => import('./componentes/agente/agente').then(m => m.AgenteComponent),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-atividades',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividades').then(m => m.TabelaAtividadesComponent),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-atividades/novo',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividade-form').then(m => m.TabelaAtividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-atividades/:codigo/editar',
    loadComponent: () => import('./componentes/tabela-atividades/tabela-atividade-form').then(m => m.TabelaAtividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-produtividade',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade').then(m => m.TabelaProdutividadeComponent),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-produtividade/novo',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade-form').then(m => m.TabelaProdutividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-produtividade/:codigo/editar',
    loadComponent: () => import('./componentes/tabela-produtividade/tabela-produtividade-form').then(m => m.TabelaProdutividadeForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-ocorrencias',
    loadComponent: () => import('./componentes/tabela-ocorrencias/tabela-ocorrencias').then(m => m.TabelaOcorrenciasComponent),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-ocorrencias/novo',
    loadComponent: () => import('./componentes/tabela-ocorrencias/tabela-ocorrencia-form').then(m => m.TabelaOcorrenciaForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'tabela-ocorrencias/:codigo/editar',
    loadComponent: () => import('./componentes/tabela-ocorrencias/tabela-ocorrencia-form').then(m => m.TabelaOcorrenciaForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'agente/novo',
    loadComponent: () => import('./componentes/agente/agente-form').then(m => m.AgenteForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: 'agente/:matricula/editar',
    loadComponent: () => import('./componentes/agente/agente-form').then(m => m.AgenteForm),
    canActivate: [requireAuthGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
