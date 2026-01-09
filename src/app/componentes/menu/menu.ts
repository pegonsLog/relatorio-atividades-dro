import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AutoFocusDirective } from '../../shared/auto-focus.directive';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { UsuariosService } from '../../services/usuarios.service';
import { HeroIconComponent } from '../../shared/icons/heroicons';
import { firstValueFrom } from 'rxjs';

interface MenuItem {
  icon: string;
  heroIcon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterModule, FormsModule, AutoFocusDirective, HeroIconComponent],
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})
export class Menu implements OnInit {
  constructor(
    private router: Router,
    private auth: AuthService,
    private userContext: UserContextService,
    private usuarios: UsuariosService,
  ) { }

  displayName = '';
  displayPerfil = '';

  protected readonly menuItems = signal<MenuItem[]>([
    { icon: 'mdi-file-document', heroIcon: 'document-text', label: 'Relatório Base', route: '/relatorio-base' },
    { icon: 'mdi-clipboard-text-outline', heroIcon: 'clipboard-document', label: 'Relatório de Atividade', route: '/item-atividade' },
    { icon: 'mdi-clipboard-check-outline', heroIcon: 'clipboard-document-check', label: 'Relatório de Produtividade', route: '/item-produtividade' },
    { icon: 'mdi-alert-outline', heroIcon: 'exclamation-triangle', label: 'Relatório de Ocorrências', route: '/item-ocorrencia' },
    { icon: 'mdi-account-search', heroIcon: 'user-circle', label: 'Relatórios por Coordenador', route: '/relatorios-coordenador' },
  ]);

  protected readonly adminItems = signal<MenuItem[]>([
    { icon: 'mdi-account', heroIcon: 'user', label: 'Tabela de Agentes', route: '/agente' },
    { icon: 'mdi-account-group', heroIcon: 'user-group', label: 'Tabela de Usuário', route: '/usuarios' },
    { icon: 'mdi-table-large', heroIcon: 'table-cells', label: 'Tabela de Atividades', route: '/tabela-atividades' },
    { icon: 'mdi-table-large', heroIcon: 'table-cells', label: 'Tabela de Produtividade', route: '/tabela-produtividade' },
    { icon: 'mdi-table-large', heroIcon: 'table-cells', label: 'Tabela de Ocorrências', route: '/tabela-ocorrencias' }
  ]);

  showFilterModal = false;
  selectedGerencia = '';
  selectedTurno = '';

  readonly gerencias = ['GARBO', 'GARNE', 'GARNP', 'GARVN', 'GEACE', 'GAOPE'];
  readonly turnos = ['MANHÃ', 'TARDE', 'MADRUGADA'];

  onMenuClick(event: Event, item: MenuItem) {
    if (item.route === '/relatorio-base') {
      event.preventDefault();
      this.openRelatorioBaseModal();
      return;
    }
    if (['/item-atividade', '/item-produtividade', '/item-ocorrencia'].includes(item.route)) {
      event.preventDefault();
      this.openReportFilterModal(item.route);
      return;
    }
  }

  openRelatorioBaseModal() { this.showFilterModal = true; }
  closeRelatorioBaseModal() { this.showFilterModal = false; }

  confirmRelatorioBaseFilters() {
    const queryParams: any = {
      gerencia: this.selectedGerencia || undefined,
      turno: this.selectedTurno || undefined,
    };
    this.showFilterModal = false;
    this.router.navigate(['/relatorio-base'], { queryParams });
  }

  showReportFilterModal = false;
  selectedReportRoute: string | null = null;
  reportFilter = { dataInicio: '', dataFim: '', gerencia: '', turno: '' };

  private isValidBRDate(s: string): boolean {
    if (!s) return false;
    const re = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!re.test(s.trim())) return false;
    const [dd, mm, yyyy] = s.split('/').map(n => Number(n));
    const d = new Date(yyyy, mm - 1, dd);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === yyyy && (d.getMonth() + 1) === mm && d.getDate() === dd;
  }

  private brToDate(s: string): Date | null {
    if (!this.isValidBRDate(s)) return null;
    const [dd, mm, yyyy] = s.split('/').map(n => Number(n));
    return new Date(yyyy, mm - 1, dd);
  }

  private brToISO(s: string): string | null {
    const d = this.brToDate(s);
    if (!d) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onDateInput(field: 'dataInicio' | 'dataFim', event: Event) {
    const input = event.target as HTMLInputElement;
    let v = (input.value || '').replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) {
      v = v.replace(/(\d{2})(\d{2})(\d{0,4}).*/, '$1/$2/$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,2}).*/, '$1/$2');
    }
    input.value = v;
    this.reportFilter[field] = v;
  }

  get reportFiltersValid(): boolean {
    const { dataInicio, dataFim } = this.reportFilter;
    if (!this.isValidBRDate(dataInicio) || !this.isValidBRDate(dataFim)) return false;
    const di = this.brToDate(dataInicio)!;
    const df = this.brToDate(dataFim)!;
    return di.getTime() <= df.getTime();
  }

  openReportFilterModal(route: string) {
    this.selectedReportRoute = route;
    this.showReportFilterModal = true;
  }

  closeReportFilterModal() { this.showReportFilterModal = false; }

  confirmReportFilters() {
    if (!this.selectedReportRoute || !this.reportFiltersValid) return;
    const { dataInicio, dataFim, gerencia, turno } = this.reportFilter;
    const queryParams: any = {
      dataInicio: this.brToISO(dataInicio)!,
      dataFim: this.brToISO(dataFim)!,
      gerencia: gerencia || undefined,
      turno: turno || undefined,
      fromMenu: 1,
    };
    this.showReportFilterModal = false;
    this.router.navigate([this.selectedReportRoute], { queryParams });
  }

  requiresDirectNav(route: string): boolean {
    return !['/relatorio-base', '/item-atividade', '/item-produtividade', '/item-ocorrencia'].includes(route);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  async ngOnInit(): Promise<void> {
    await this.loadUserInfo();
  }

  private async loadUserInfo(): Promise<void> {
    try {
      const name = (localStorage.getItem('dro.currentUserName') || '').trim();
      const perfil = (localStorage.getItem('dro.currentUserPerfil') || '').trim();
      if (name || perfil) {
        this.displayName = name || 'Usuário';
        this.displayPerfil = perfil || '';
        return;
      }
      const id = this.userContext.getCurrentUserId();
      if (!id) return;
      const usuario = await firstValueFrom(this.usuarios.getByMatricula(Number(id)));
      if (usuario) {
        this.displayName = (usuario.nome || 'Usuário').trim();
        this.displayPerfil = (usuario.perfil || '').trim();
      }
    } catch { /* silencioso */ }
  }
}
