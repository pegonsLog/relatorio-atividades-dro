import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ItemProdutividadeService, RelatorioBaseService, ExportExcelService } from '../../../services';
import { ItemProdutividade } from '../../../models';
import { GraficosProdutividadeComponent } from '../../graficos-produtividade/graficos-produtividade';

@Component({
  selector: 'app-item-produtividade-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GraficosProdutividadeComponent],
  templateUrl: './item-produtividade-list.html',
  styleUrls: ['./item-produtividade-list.scss']
})
export class ItemProdutividadeList implements OnInit, OnDestroy {
  filtro = '';
  itens: ItemProdutividade[] = [];
  // Loading
  loading = true;
  // Contexto
  contextRelatorioId: string | null = null;
  contextAtividadeId: string | null = null;
  // Filtros vindos do menu
  isFromMenu = false;
  private dataInicioStr: string | null = null;
  private dataFimStr: string | null = null;
  private dataInicioDate: Date | null = null;
  private dataFimDate: Date | null = null;
  private filtroGerencia: string | null = null;
  private filtroTurno: string | null = null;
  private relatorioMap = new Map<string | number, { gerencia: string; turno: string }>();
  // Paginação
  page = 1;
  pageSize = 5;
  readonly pageSizes = [5, 10, 20, 50];
  // Ordenação
  sortKey: 'idProdutividade' | 'codProd' | 'nomeProdutividade' | 'qtdProd' | 'idAtividade' | 'idRelatorio' = 'idProdutividade';
  sortDir: 'asc' | 'desc' = 'asc';
  // Modal de exclusão
  showDeleteModal = false;
  selectedItemId: number | null = null;
  deleting = false;

  // Alertas (ex.: redirecionamento do guard)
  showAlert = false;
  private alertKey: string | null = null;
  private alertTimer: any = null;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ItemProdutividadeService);
  private readonly relService = inject(RelatorioBaseService);
  private readonly exportService = inject(ExportExcelService);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('qProd') ?? '';
    // Contexto de navegação: pertencem a uma atividade (e relatório) - IDs alfanuméricos
    const ir = (qp.get('idRelatorio') || '').trim();
    const ia = (qp.get('idAtividade') || '').trim();
    this.contextRelatorioId = ir || null;
    this.contextAtividadeId = ia || null;
    // Filtros do menu
    this.isFromMenu = (qp.get('fromMenu') ?? '') !== '';
    this.dataInicioStr = qp.get('dataInicio');
    this.dataFimStr = qp.get('dataFim');
    this.filtroGerencia = qp.get('gerencia');
    this.filtroTurno = qp.get('turno');
    if (this.dataInicioStr) this.dataInicioDate = new Date(`${this.dataInicioStr}T00:00:00`);
    if (this.dataFimStr) this.dataFimDate = new Date(`${this.dataFimStr}T23:59:59.999`);
    const p = Number(qp.get('pageProd'));
    const ps = Number(qp.get('pageSizeProd'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
    const sk = qp.get('prodSortKey') as any;
    const sd = qp.get('prodSortDir') as any;
    const validKeys = ['idProdutividade','codProd','nomeProdutividade','qtdProd','idAtividade','idRelatorio'];
    if (sk && validKeys.includes(sk)) this.sortKey = sk;
    if (sd && ['asc','desc'].includes(sd)) this.sortDir = sd;

    // Alertas vindos de redirecionamentos (ex.: guard)
    const alert = qp.get('alert');
    if (alert) {
      this.alertKey = alert;
      this.showAlert = true;
      // auto-hide após 5s
      this.alertTimer = setTimeout(() => this.closeAlert(), 5000);
    }
    
    // Carregar itens da lista
    this.service.getItens().subscribe({
      next: (list) => {
        this.itens = list ?? [];
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });

    // Carregar mapa de relatórios
    this.relService.getRelatorios$().subscribe(relatorios => {
      this.relatorioMap.clear();
      for (const r of relatorios) {
        this.relatorioMap.set(r.idRelatorio!, { gerencia: r.gerencia || '', turno: r.turno || '' });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  get alertText(): string {
    switch (this.alertKey) {
      case 'missingContext':
        return 'Para criar um item de produtividade, selecione uma Atividade a partir da lista (contexto obrigatório).';
      default:
        return '';
    }
  }

  closeAlert() {
    this.showAlert = false;
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { alert: undefined },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  get filtrados(): ItemProdutividade[] {
    const f = this.filtro.trim().toLowerCase();
    // Aplica contexto (atividade > relatório)
    let base = [...this.itens];
    if (this.contextAtividadeId) {
      base = base.filter(i => String(i.idAtividade) === this.contextAtividadeId);
    } else if (this.contextRelatorioId) {
      base = base.filter(i => String(i.idRelatorio) === this.contextRelatorioId);
    }
    // Período
    if (this.dataInicioDate) {
      base = base.filter(i => i.data && new Date(i.data).getTime() >= this.dataInicioDate!.getTime());
    }
    if (this.dataFimDate) {
      base = base.filter(i => i.data && new Date(i.data).getTime() <= this.dataFimDate!.getTime());
    }
    // Gerência/turno via idRelatorio
    if (this.filtroGerencia) {
      base = base.filter(i => {
        const meta = this.relatorioMap.get(i.idRelatorio);
        return meta ? String(meta.gerencia || '').toLowerCase() === String(this.filtroGerencia || '').toLowerCase() : false;
      });
    }
    if (this.filtroTurno) {
      base = base.filter(i => {
        const meta = this.relatorioMap.get(i.idRelatorio);
        return meta ? String(meta.turno || '').toLowerCase() === String(this.filtroTurno || '').toLowerCase() : false;
      });
    }
    // Texto: considerar apenas colunas aparentes
    return base.filter(i => {
      if (!f) return true;
      const common =
        String(i.codProd).includes(f) ||
        String(i.nomeProdutividade || '').toLowerCase().includes(f) ||
        String(i.qtdProd).includes(f);
      const includeId = !this.isFromMenu;
      const includeAtividade = !this.isFromMenu;
      const includeRelatorio = !this.isFromMenu && !this.contextRelatorioId;
      const idMatch = includeId && String(i.idProdutividade).includes(f);
      const ativMatch = includeAtividade && String(i.idAtividade).includes(f);
      const relMatch = includeRelatorio && String(i.idRelatorio).includes(f);
      return common || idMatch || ativMatch || relMatch;
    });
  }

  // Itens da página atual
  get pageItems(): ItemProdutividade[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  // Helpers
  get total(): number { return this.filtrados.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIndex(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goTo(p: number) {
    this.page = Math.min(this.totalPages, Math.max(1, p));
    this.syncQuery();
  }

  // Lista filtrada e ordenada
  get sorted(): ItemProdutividade[] {
    const arr = [...this.filtrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let vaN = 0, vbN = 0;
      let vaS = '', vbS = '';
      let isString = false;
      switch (this.sortKey) {
        case 'idProdutividade':
          vaN = a.idProdutividade; vbN = b.idProdutividade; break;
        case 'codProd':
          vaN = a.codProd; vbN = b.codProd; break;
        case 'nomeProdutividade':
          vaS = String(a.nomeProdutividade || ''); vbS = String(b.nomeProdutividade || ''); isString = true; break;
        case 'qtdProd':
          vaN = a.qtdProd; vbN = b.qtdProd; break;
        case 'idAtividade':
          vaS = String(a.idAtividade); vbS = String(b.idAtividade); isString = true; break;
        case 'idRelatorio':
          vaS = String(a.idRelatorio); vbS = String(b.idRelatorio); isString = true; break;
      }
      if (isString) {
        const cmp = vaS.localeCompare(vbS);
        return cmp * dir;
      }
      if (vaN < vbN) return -1 * dir;
      if (vaN > vbN) return 1 * dir;
      return 0;
    });
    return arr;
  }

  setSort(key: 'idProdutividade' | 'codProd' | 'nomeProdutividade' | 'qtdProd' | 'idAtividade' | 'idRelatorio') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.goTo(1);
  }

  onFilterChange() {
    this.goTo(1);
    this.syncQuery();
  }

  clearFilter() {
    if (!this.filtro) return;
    this.filtro = '';
    this.onFilterChange();
  }

  private syncQuery() {
    const queryParams = {
      qProd: this.filtro || undefined,
      pageProd: this.page !== 1 ? this.page : undefined,
      pageSizeProd: this.pageSize !== 5 ? this.pageSize : undefined,
      prodSortKey: this.sortKey !== 'idProdutividade' ? this.sortKey : undefined,
      prodSortDir: this.sortDir !== 'asc' ? this.sortDir : undefined,
      idRelatorio: this.contextRelatorioId || undefined,
      idAtividade: this.contextAtividadeId || undefined,
      // Preserva filtros do menu
      dataInicio: this.dataInicioStr || undefined,
      dataFim: this.dataFimStr || undefined,
      gerencia: this.filtroGerencia || undefined,
      turno: this.filtroTurno || undefined,
      fromMenu: this.isFromMenu ? 1 : undefined,
    } as any;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  exportExcel(): void {
    const rows = this.sorted.map(i => ({
      'Código Prod.': i.codProd,
      'Nome Produtividade': i.nomeProdutividade,
      'Quantidade': i.qtdProd,
      'Data': this.formatDateSafe(i.data),
    }));
    const name = this.buildFileName('Produtividade');
    this.exportService.exportAsExcel(rows, name, 'Produtividade');
  }

  private buildFileName(prefix: string): string {
    const parts: string[] = [prefix];
    if (this.dataInicioStr || this.dataFimStr) {
      const di = (this.dataInicioStr || '').replaceAll('-', '');
      const df = (this.dataFimStr || '').replaceAll('-', '');
      parts.push([di, df].filter(Boolean).join('-'));
    }
    if (this.filtroGerencia) parts.push(`GER_${this.filtroGerencia}`);
    if (this.filtroTurno) parts.push(`TUR_${this.filtroTurno}`);
    return parts.filter(Boolean).join('_');
  }

  formatDateSafe(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // Query params para o botão "Novo"
  get novoQueryParams() {
    return {
      idRelatorio: this.contextRelatorioId || undefined,
      idAtividade: this.contextAtividadeId || undefined,
    } as any;
  }

  newItem(): void {
    // Para criar um item de produtividade, o obrigatório é ter idAtividade (FK)
    const hasContext = !!this.contextAtividadeId;
    if (!hasContext) {
      // Mostra alerta de contexto ausente
      this.alertKey = 'missingContext';
      this.showAlert = true;
      if (this.alertTimer) clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(() => this.closeAlert(), 5000);
      // Mantém a URL sincronizada com o alerta para consistência
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { alert: 'missingContext' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    this.router.navigate(['/item-produtividade/novo'], {
      queryParams: this.novoQueryParams,
      queryParamsHandling: 'merge',
    });
  }

  // Modal de exclusão
  openDelete(id: number): void {
    this.selectedItemId = id;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedItemId = null;
    this.deleting = false;
  }

  closeDelete() {
    this.closeDeleteModal();
  }

  get toDelete() {
    return this.selectedItemId;
  }

  async confirmDelete(): Promise<void> {
    if (this.selectedItemId === null) return;
    this.deleting = true;
    try {
      await Promise.resolve(this.service.delete(this.selectedItemId));
      this.closeDeleteModal();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }
}
