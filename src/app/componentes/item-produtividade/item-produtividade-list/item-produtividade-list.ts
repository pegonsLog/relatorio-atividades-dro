import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ItemProdutividadeService } from '../../../services';
import { ItemProdutividade } from '../../../models';

@Component({
  selector: 'app-item-produtividade-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './item-produtividade-list.html',
  styleUrls: ['./item-produtividade-list.scss']
})
export class ItemProdutividadeList implements OnInit, OnDestroy {
  filtro = '';
  itens: ItemProdutividade[] = [];
  // Contexto
  contextRelatorioId: string | null = null;
  contextAtividadeId: string | null = null;
  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];
  // Ordenação
  sortKey: 'idProdutividade' | 'codProd' | 'qtdProd' | 'idAtividade' | 'idRelatorio' = 'idProdutividade';
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

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('qProd') ?? '';
    // Contexto de navegação: pertencem a uma atividade (e relatório) - IDs alfanuméricos
    const ir = (qp.get('idRelatorio') || '').trim();
    const ia = (qp.get('idAtividade') || '').trim();
    this.contextRelatorioId = ir || null;
    this.contextAtividadeId = ia || null;
    const p = Number(qp.get('pageProd'));
    const ps = Number(qp.get('pageSizeProd'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
    const sk = qp.get('prodSortKey') as any;
    const sd = qp.get('prodSortDir') as any;
    const validKeys = ['idProdutividade','codProd','qtdProd','idAtividade','idRelatorio'];
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
    this.service.getItens().subscribe(list => {
      this.itens = list ?? [];
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
    // Primeiro aplica o contexto (atividade > relatório), depois o filtro textual
    let base = [...this.itens];
    if (this.contextAtividadeId) {
      base = base.filter(i => String(i.idAtividade) === this.contextAtividadeId);
    } else if (this.contextRelatorioId) {
      base = base.filter(i => String(i.idRelatorio) === this.contextRelatorioId);
    }

    return base.filter(i => {
      if (!f) return true;
      return (
        String(i.idProdutividade).includes(f) ||
        String(i.codProd).includes(f) ||
        String(i.qtdProd).includes(f) ||
        String(i.idAtividade).includes(f) ||
        String(i.idRelatorio).includes(f)
      );
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

  setSort(key: 'idProdutividade' | 'codProd' | 'qtdProd' | 'idAtividade' | 'idRelatorio') {
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
      pageSizeProd: this.pageSize !== 10 ? this.pageSize : undefined,
      prodSortKey: this.sortKey !== 'idProdutividade' ? this.sortKey : undefined,
      prodSortDir: this.sortDir !== 'asc' ? this.sortDir : undefined,
      idRelatorio: this.contextRelatorioId || undefined,
      idAtividade: this.contextAtividadeId || undefined,
    } as any;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
