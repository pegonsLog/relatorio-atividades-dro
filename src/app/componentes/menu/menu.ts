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
      icon: 'mdi-clipboard-text-outline',
      label: 'Relatório de Atividade',
      route: '/item-atividade'
    },
    {
      icon: 'mdi-clipboard-check-outline',
      label: 'Relatório de Produtividade',
      route: '/item-produtividade'
    },
    {
      icon: 'mdi-alert-outline',
      label: 'Relatório de Ocorrências',
      route: '/item-ocorrencia'
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
      icon: 'mdi-table-large',
      label: 'Tabela de Atividades',
      route: '/tabela-atividades'
    },
    {
      icon: 'mdi-table-large',
      label: 'Tabela de Produtividade',
      route: '/tabela-produtividade'
    },
    {
      icon: 'mdi-table-large',
      label: 'Tabela de Ocorrências',
      route: '/tabela-ocorrencias'
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
      return;
    }
    // Abrir modal de filtros para relatórios específicos
    if (['/item-atividade', '/item-produtividade', '/item-ocorrencia'].includes(item.route)) {
      event.preventDefault();
      this.openReportFilterModal(item.route);
      return;
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

  // ===== Novo modal para relatórios (Atividade/Produtividade/Ocorrências) =====
  showReportFilterModal = false;
  selectedReportRoute: string | null = null;
  reportFilter = {
    dataInicio: '',
    dataFim: '',
    gerencia: '', // '' = Todos
    turno: '',    // '' = Todos
  };

  get reportFiltersValid(): boolean {
    const { dataInicio, dataFim } = this.reportFilter;
    if (!dataInicio || !dataFim) return false;
    return dataInicio <= dataFim;
  }

  openReportFilterModal(route: string) {
    this.selectedReportRoute = route;
    this.showReportFilterModal = true;
  }

  closeReportFilterModal() {
    this.showReportFilterModal = false;
  }

  confirmReportFilters() {
    if (!this.selectedReportRoute || !this.reportFiltersValid) return;
    const { dataInicio, dataFim, gerencia, turno } = this.reportFilter;
    const queryParams: any = {
      dataInicio,
      dataFim,
      gerencia: gerencia || undefined,
      turno: turno || undefined,
      fromMenu: 1,
    };
    this.showReportFilterModal = false;
    this.router.navigate([this.selectedReportRoute], { queryParams });
  }

  // Usado no template para decidir se navega direto ou abre modal
  requiresDirectNav(route: string): boolean {
    return !['/relatorio-base', '/item-atividade', '/item-produtividade', '/item-ocorrencia'].includes(route);
  }
}
