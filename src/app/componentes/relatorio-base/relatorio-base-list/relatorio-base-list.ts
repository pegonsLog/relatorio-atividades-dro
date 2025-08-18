import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelatorioBase } from '../../../models';
import { RouterModule } from '@angular/router';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { RelatorioBaseFormComponent } from '../relatorio-base-form/relatorio-base-form';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-relatorio-base-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RelatorioBaseFormComponent],
  templateUrl: './relatorio-base-list.html',
  styleUrls: ['./relatorio-base-list.scss']
})
export class RelatorioBaseList implements OnInit {
  private readonly service = inject(RelatorioBaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Dados
  relatorios: RelatorioBase[] = [];
  selected: RelatorioBase | null = null;
  saving = false;

  // Filtro
  filtro = '';

  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];

  // Ordenação
  sortKey: 'data' | 'gerencia' | 'turno' | 'mat1' | 'mat2' | 'coord' | 'superv' = 'data';
  sortDir: 'asc' | 'desc' = 'asc';

  // Modal de exclusão
  showDeleteModal = false;
  toDelete?: string | number;
  deleting = false;

  // Âncora para rolar até o formulário ao editar
  @ViewChild('formTop') formTop?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Query params
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('q') ?? '';
    const p = Number(qp.get('page'));
    const ps = Number(qp.get('pageSize'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
    const sk = qp.get('sortKey') as any;
    const sd = qp.get('sortDir') as any;
    const allowed: string[] = ['data','gerencia','turno','mat1','mat2','coord','superv'];
    if (sk && allowed.includes(sk)) this.sortKey = sk;
    if (sd && ['asc','desc'].includes(sd)) this.sortDir = sd;

    this.service.getRelatorios$().subscribe(list => {
      this.relatorios = list ?? [];
    });
  }

  // Filtrados
  get filtrados(): RelatorioBase[] {
    const f = this.filtro.trim().toLowerCase();
    if (!f) return this.relatorios;
    return this.relatorios.filter(r =>
      (r.gerencia?.toLowerCase().includes(f)) ||
      (r.turno?.toLowerCase().includes(f)) ||
      String(r.mat1 ?? '').includes(f) ||
      String(r.mat2 ?? '').includes(f) ||
      String(r.coord ?? '').includes(f) ||
      String(r.superv ?? '').includes(f)
    );
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

  startCreate(): void {
    this.selected = null;
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
    this.goTo(1);
  }

  clearFilter() {
    if (!this.filtro) return;
    this.filtro = '';
    this.onFilterChange();
  }

  private syncQuery() {
    const queryParams = {
      q: this.filtro || undefined,
      page: this.page !== 1 ? this.page : undefined,
      pageSize: this.pageSize !== 10 ? this.pageSize : undefined,
      sortKey: this.sortKey !== 'data' ? this.sortKey : undefined,
      sortDir: this.sortDir !== 'asc' ? this.sortDir : undefined,
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
