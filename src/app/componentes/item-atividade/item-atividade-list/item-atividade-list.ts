import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemAtividadeService } from '../../../services';
import { ItemAtividade } from '../../../models';

@Component({
  selector: 'app-item-atividade-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './item-atividade-list.html',
  styleUrls: ['./item-atividade-list.scss']
})
export class ItemAtividadeList implements OnInit {
  filtro = '';
  atividades: ItemAtividade[] = [];
  // Loading
  loading = true;
  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];
  // Ordenação
  sortKey: 'idAtividade' | 'item' | 'local' | 'codAtv' | 'chegada' = 'idAtividade';
  sortDir: 'asc' | 'desc' = 'asc';
  // Modal de exclusão
  showDeleteModal = false;
  selectedItemId: string | number | null = null;
  deleting = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly atividadeService = inject(ItemAtividadeService);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('q') ?? '';
    const p = Number(qp.get('page'));
    const ps = Number(qp.get('pageSize'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
    const sk = qp.get('sortKey') as any;
    const sd = qp.get('sortDir') as any;
    if (sk && ['idAtividade','item','local','codAtv','chegada'].includes(sk)) this.sortKey = sk;
    if (sd && ['asc','desc'].includes(sd)) this.sortDir = sd;

    // Carregar lista do service
    this.atividadeService.getAtividades().subscribe({
      next: (list) => {
        this.atividades = list ?? [];
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  get filtrados(): ItemAtividade[] {
    const f = this.filtro.trim().toLowerCase();
    return this.atividades.filter(a => !f || 
      a.local.toLowerCase().includes(f) || 
      a.acionamento.toLowerCase().includes(f) ||
      String(a.codAtv).includes(f) ||
      String(a.item).includes(f)
    );
  }

  // Itens da página atual
  get pageItems(): ItemAtividade[] {
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
  get sorted(): ItemAtividade[] {
    const arr = [...this.filtrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number | Date = '';
      let vb: string | number | Date = '';
      switch (this.sortKey) {
        case 'idAtividade':
          va = a.idAtividade; vb = b.idAtividade; break;
        case 'item':
          va = a.item; vb = b.item; break;
        case 'local':
          va = a.local.toLowerCase(); vb = b.local.toLowerCase(); break;
        case 'codAtv':
          va = a.codAtv; vb = b.codAtv; break;
        case 'chegada':
          va = a.chegada; vb = b.chegada; break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  setSort(key: 'idAtividade' | 'item' | 'local' | 'codAtv' | 'chegada') {
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
      q: this.filtro || undefined,
      page: this.page !== 1 ? this.page : undefined,
      pageSize: this.pageSize !== 10 ? this.pageSize : undefined,
      sortKey: this.sortKey !== 'idAtividade' ? this.sortKey : undefined,
      sortDir: this.sortDir !== 'asc' ? this.sortDir : undefined,
    } as any;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Abertura/fechamento do modal de exclusão
  openDelete(id: string | number): void {
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
      await Promise.resolve(this.atividadeService.delete(this.selectedItemId));
      this.closeDeleteModal();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
