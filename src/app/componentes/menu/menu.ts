import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})
export class Menu {
  constructor(private router: Router) {}

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

  // Modal de filtros para Relatório Base
  showFilterModal = false;
  selectedGerencia = '';
  selectedTurno = '';

  readonly gerencias = ['GARBO', 'GARNE', 'GARNP', 'GARVN', 'GEACE', 'GAOPE'];
  readonly turnos = ['Manhã', 'Tarde', 'Madrugada'];

  onMenuClick(event: Event, item: MenuItem) {
    if (item.route === '/relatorio-base') {
      event.preventDefault();
      this.openRelatorioBaseModal();
    }
  }

  openRelatorioBaseModal() {
    this.showFilterModal = true;
  }

  closeRelatorioBaseModal() {
    this.showFilterModal = false;
  }

  confirmRelatorioBaseFilters() {
    const queryParams: any = {
      gerencia: this.selectedGerencia || undefined,
      turno: this.selectedTurno || undefined,
    };
    this.showFilterModal = false;
    this.router.navigate(['/relatorio-base'], { queryParams });
    // Limpeza opcional
    // this.selectedGerencia = '';
    // this.selectedTurno = '';
  }
}
