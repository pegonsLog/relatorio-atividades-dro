import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabelaProdutividadeService } from '../../services/tabela-produtividade.service';
import { TabelaProdutividade } from '../../models/tabela-produtividade.interface';

@Component({
  selector: 'app-tabela-produtividade',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tabela-produtividade.html',
  styleUrl: './tabela-produtividade.scss'
})
export class TabelaProdutividadeComponent implements OnInit {
  itens: TabelaProdutividade[] = [];
  filtro = '';
  // Loading
  loading = true;
  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];
  // Ordenação
  sortKey: 'codigo' | 'nome' = 'codigo';
  sortDir: 'asc' | 'desc' = 'asc';
  // Modal de exclusão
  showDeleteModal = false;
  toDelete?: number;
  deleting = false;

  constructor(private service: TabelaProdutividadeService) {}

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (list) => {
        this.itens = (list ?? []).map(i => ({ ...i, codigo: Number(i.codigo) }));
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  get filtrados(): TabelaProdutividade[] {
    const f = (this.filtro || '').toLowerCase().trim();
    return this.itens.filter(i => !f || String(i.codigo).includes(f) || (i.nome || '').toLowerCase().includes(f));
  }

  clearFilter() {
    this.filtro = '';
    this.goTo(1);
  }

  // Lista ordenada
  get sorted(): TabelaProdutividade[] {
    const arr = [...this.filtrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (this.sortKey) {
        case 'codigo': va = a.codigo; vb = b.codigo; break;
        case 'nome': va = (a.nome || '').toLowerCase(); vb = (b.nome || '').toLowerCase(); break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  // Itens da página atual
  get pageItems(): TabelaProdutividade[] {
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
  }

  setSort(key: 'codigo' | 'nome') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.goTo(1);
  }

  // Exclusão
  openDelete(codigo: number) {
    this.toDelete = codigo;
    this.showDeleteModal = true;
  }

  closeDelete() {
    this.showDeleteModal = false;
    this.toDelete = undefined;
    this.deleting = false;
  }

  async confirmDelete() {
    if (this.toDelete === undefined) return;
    this.deleting = true;
    try {
      await this.service.delete(this.toDelete);
      this.itens = this.itens.filter(i => i.codigo !== this.toDelete);
      this.closeDelete();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }
}
