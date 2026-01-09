import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelatorioBase } from '../../../models';
import { RouterModule } from '@angular/router';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { RelatorioBaseFormComponent } from '../relatorio-base-form/relatorio-base-form';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorio-base-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RelatorioBaseFormComponent, HeroIconComponent],
  templateUrl: './relatorio-base-list.html',
  styleUrls: ['./relatorio-base-list.scss']
})
export class RelatorioBaseList implements OnInit, OnDestroy {
  private readonly service = inject(RelatorioBaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Dados
  relatorios: RelatorioBase[] = [];
  selected: RelatorioBase | null = null;
  saving = false;

  // Filtro (texto)
  filtro = '';
  // Filtros vindos de query params (apenas para defaults do formulário)
  filterGerencia = '';
  filterTurno = '';
  // Defaults para o formulário
  defaultGerencia = '';
  defaultTurno = '';


  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];

  // Ordenação
  sortKey: 'createdAt' | 'data' | 'gerencia' | 'turno' | 'mat1' | 'mat2' | 'coord' | 'superv' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  // Debounce do filtro
  private filterDebounce?: any;

  // Modal de exclusão
  showDeleteModal = false;
  toDelete?: string | number;
  deleting = false;

  // Âncora para rolar até o formulário ao editar
  @ViewChild('formTop') formTop?: ElementRef<HTMLElement>;
  // Referência ao componente de formulário para poder resetar após salvar
  @ViewChild(RelatorioBaseFormComponent) relForm?: RelatorioBaseFormComponent;

  ngOnInit(): void {
    // Query params (assina mudanças para refletir filtros do modal externo)
    this.route.queryParamMap.subscribe(qp => {
      this.filtro = qp.get('q') ?? '';
      this.filterGerencia = qp.get('gerencia') ?? '';
      this.filterTurno = qp.get('turno') ?? '';
      this.defaultGerencia = this.filterGerencia;
      this.defaultTurno = this.filterTurno;
      const p = Number(qp.get('page'));
      const ps = Number(qp.get('pageSize'));
      this.page = Number.isFinite(p) && p > 0 ? p : 1;
      this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
      const sk = qp.get('sortKey') as any;
      const sd = qp.get('sortDir') as any;
      const allowed: string[] = ['createdAt', 'data', 'gerencia', 'turno', 'mat1', 'mat2', 'coord', 'superv'];
      if (sk && allowed.includes(sk)) this.sortKey = sk;
      if (sd && ['asc', 'desc'].includes(sd)) this.sortDir = sd;
    });

    this.service.getRelatorios$().subscribe(list => {
      this.relatorios = list ?? [];
    });
  }

  // Utilitário: formata data em dd/MM/yyyy para busca
  private formatDateStr(d: any): string {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }

  ngOnDestroy(): void {
    if (this.filterDebounce) clearTimeout(this.filterDebounce);
  }

  // Filtrados
  get filtrados(): RelatorioBase[] {
    const f = this.filtro.trim().toLowerCase();
    // Aplica filtros de gerência/turno vindos do modal externo (query params)
    const byFixed = this.relatorios.filter(r => {
      const okGer = this.filterGerencia
        ? String(r.gerencia || '').toLowerCase() === String(this.filterGerencia || '').toLowerCase()
        : true;
      const okTur = this.filterTurno
        ? String(r.turno || '').toLowerCase() === String(this.filterTurno || '').toLowerCase()
        : true;
      return okGer && okTur;
    });
    
    let filtered = byFixed;
    if (f) {
      filtered = byFixed.filter(r => {
        const dateStr = this.formatDateStr(r.data).toLowerCase();
        return (
          dateStr.includes(f) ||
          String(r.mat1 ?? '').toLowerCase().includes(f) ||
          String(r.mat2 ?? '').toLowerCase().includes(f) ||
          String(r.coord ?? '').toLowerCase().includes(f) ||
          String(r.superv ?? '').toLowerCase().includes(f)
        );
      });
    }
    
    // Retorna os 10 últimos registros (mais recentes por createdAt)
    if (filtered.length === 0) return [];
    const sorted = [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAt as any).getTime() || 0;
      const timeB = new Date(b.createdAt as any).getTime() || 0;
      return timeB - timeA; // Mais recente primeiro
    });
    return sorted.slice(0, 10);
  }

  // Derivados
  get total(): number { return this.filtrados.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIndex(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goTo(p: number) {
    this.page = Math.min(this.totalPages, Math.max(1, p));
    this.syncQuery();
  }

  get sorted(): RelatorioBase[] {
    const arr = [...this.filtrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: any;
      let vb: any;
      switch (this.sortKey) {
        case 'createdAt':
          va = new Date(a.createdAt as any).getTime() || 0;
          vb = new Date(b.createdAt as any).getTime() || 0;
          break;
        case 'data':
          va = new Date(a.data).getTime();
          vb = new Date(b.data).getTime();
          break;
        case 'gerencia':
          va = (a.gerencia || '').toLowerCase();
          vb = (b.gerencia || '').toLowerCase();
          break;
        case 'turno':
          va = (a.turno || '').toLowerCase();
          vb = (b.turno || '').toLowerCase();
          break;
        case 'mat1':
          va = a.mat1 ?? 0; vb = b.mat1 ?? 0; break;
        case 'mat2':
          va = a.mat2 ?? 0; vb = b.mat2 ?? 0; break;
        case 'coord':
          va = a.coord ?? 0; vb = b.coord ?? 0; break;
        case 'superv':
          va = a.superv ?? 0; vb = b.superv ?? 0; break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  // Itens da página atual
  get pageItems(): RelatorioBase[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  startEdit(item: RelatorioBase): void {
    this.selected = { ...item };
    // Rola a tela até o formulário para tornar a edição visível
    setTimeout(() => {
      this.formTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  cancel(): void {
    this.selected = null;
  }

  onSubmit(payload: RelatorioBase): void {
    this.saving = true;
    if (this.selected && this.selected.idRelatorio) {
      this.service.update(this.selected.idRelatorio, payload);
    } else {
      this.service.create(payload);
      // Após criar, limpa o formulário para novos lançamentos
      this.relForm?.resetToDefaults();
    }
    this.saving = false;
    this.cancel();
  }

  delete(id: string | number): void {
    if (!id) return;
    if (confirm('Deseja realmente excluir este relatório?')) {
      this.service.delete(id);
      if (this.selected && this.selected.idRelatorio === id) this.cancel();
    }
  }

  setSort(key: 'data' | 'gerencia' | 'turno' | 'mat1' | 'mat2' | 'coord' | 'superv') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.goTo(1);
  }

  onFilterChange() {
    if (this.filterDebounce) clearTimeout(this.filterDebounce);
    this.filterDebounce = setTimeout(() => {
      this.goTo(1);
    }, 250);
  }

  clearFilter() {
    if (!this.filtro) return;
    this.filtro = '';
    if (this.filterDebounce) clearTimeout(this.filterDebounce);
    // Aplica imediatamente sem debounce
    this.goTo(1);
  }

  private syncQuery() {
    const queryParams = {
      q: this.filtro?.trim() ? this.filtro.trim() : undefined,
      page: this.page !== 1 ? this.page : undefined,
      pageSize: this.pageSize !== 10 ? this.pageSize : undefined,
      // 'createdAt' é o padrão inicial; só grava se diferente disso
      sortKey: this.sortKey !== 'createdAt' ? this.sortKey : undefined,
      // 'desc' é o padrão inicial; só grava se diferente disso
      sortDir: this.sortDir !== 'desc' ? this.sortDir : undefined,
      gerencia: this.filterGerencia || undefined,
      turno: this.filterTurno || undefined,
    } as any;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }


  // Modal de exclusão
  openDelete(id: string | number) {
    this.toDelete = id;
    this.showDeleteModal = true;
  }

  closeDelete() {
    this.showDeleteModal = false;
    this.toDelete = undefined;
    this.deleting = false;
  }

  async confirmDelete() {
    if (this.toDelete == null) return;
    this.deleting = true;
    try {
      await Promise.resolve(this.service.delete(this.toDelete));
      // Lista local é atualizada pela subscription do serviço
      this.closeDelete();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }
}
