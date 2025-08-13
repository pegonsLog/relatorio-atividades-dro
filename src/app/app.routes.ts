import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { MaterialModule } from './shared/material.module';

// Componente temporário para páginas em desenvolvimento
@Component({
  selector: 'app-temp-page',
  imports: [MaterialModule],
  template: `
    <div style="padding: 24px; text-align: center;">
      <mat-card>
        <mat-card-content>
          <mat-icon style="font-size: 64px; width: 64px; height: 64px; color: #ccc;">construction</mat-icon>
          <h2>Página em Desenvolvimento</h2>
          <p>Esta seção está sendo desenvolvida e estará disponível em breve.</p>
          <button mat-raised-button color="primary" routerLink="/dashboard">
            Voltar ao Dashboard
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
class TempPage { }

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/menu',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./componentes/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'relatorios',
    component: TempPage
  },
  {
    path: 'atividades',
    component: TempPage
  },
  {
    path: 'produtividade',
    component: TempPage
  },
  {
    path: 'configuracoes',
    component: TempPage
  },
  {
    path: 'usuarios',
    component: TempPage
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
