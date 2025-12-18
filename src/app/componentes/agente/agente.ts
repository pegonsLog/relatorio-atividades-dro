import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Agente } from '../../models/agente.interface';
import { AgentesService } from '../../services/agentes.service';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-agente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeroIconComponent],
  templateUrl: './agente.html',
  styleUrl: './agente.scss'
})
export class AgenteComponent implements OnInit {
  agentes: Agente[] = [];
  agentesFiltrados: Agente[] = [];
  filtro = '';
  loading = true;
  sortKey: 'matricula' | 'nome' | 'cargo' | 'turno' | 'gerencia' = 'matricula';
  sortDir: 'asc' | 'desc' = 'asc';
  selectedMatricula?: number;
  selectedNome?: string;
  pageSizeOptions = [5, 10, 20, 50];
  pageSize = 10;
  currentPage = 1;

  constructor(private agentesService: AgentesService) { }

  ngOnInit(): void {
    const saved = Number(localStorage.getItem('agentes_pageSize'));
    if (this.pageSizeOptions.includes(saved)) this.pageSize = saved;
    this.agentesService.list().subscribe({
      next: (list) => {
        this.agentes = (list ?? []).map(a => ({ ...a, matricula: Number(a.matricula) }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  prepareDelete(a: Agente) {
    this.selectedMatricula = a.matricula;
    this.selectedNome = a.nome;
  }

  confirmDelete() {
    const mat = this.selectedMatricula;
    if (!Number.isFinite(mat)) return;
    this.delete(Number(mat));
    this.selectedMatricula = undefined;
    this.selectedNome = undefined;
  }

  async delete(matricula: number) {
    try {
      await this.agentesService.delete(matricula);
      this.agentes = this.agentes.filter(a => a.matricula !== matricula);
      this.applyFilter();
      this.clampPage();
    } catch (e) { console.error(e); }
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilter();
  }

  clearFilter() {
    this.filtro = '';
    this.currentPage = 1;
    this.applyFilter();
  }

  private applyFilter() {
    const f = (this.filtro || '').toLowerCase().trim();
    if (!f) {
      this.agentesFiltrados = [...this.agentes];
      this.clampPage();
      return;
    }
    this.agentesFiltrados = this.agentes.filter(a => {
      const nome = (a.nome || '').toLowerCase();
      const mat = String(a.matricula || '').toLowerCase();
      const cargo = (a.cargo || '').toLowerCase();
      const gerencia = (a.gerencia || '').toLowerCase();
      return nome.includes(f) || mat.includes(f) || cargo.includes(f) || gerencia.includes(f);
    });
    this.clampPage();
  }

  setSort(key: 'matricula' | 'nome' | 'cargo' | 'turno' | 'gerencia') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  get agentesOrdenados(): Agente[] {
    const arr = [...this.agentesFiltrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (this.sortKey) {
        case 'matricula': va = a.matricula; vb = b.matricula; break;
        case 'nome': va = (a.nome || '').toLowerCase(); vb = (b.nome || '').toLowerCase(); break;
        case 'cargo': va = (a.cargo || '').toLowerCase(); vb = (b.cargo || '').toLowerCase(); break;
        case 'turno': va = (a.turno || '').toLowerCase(); vb = (b.turno || '').toLowerCase(); break;
        case 'gerencia': va = (a.gerencia || '').toLowerCase(); vb = (b.gerencia || '').toLowerCase(); break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  get totalItems(): number { return this.agentesFiltrados.length; }
  get totalPages(): number { return Math.ceil(this.totalItems / this.pageSize) || 1; }
  get pageStart(): number { return this.totalItems ? (this.currentPage - 1) * this.pageSize : 0; }
  get pageEnd(): number { return this.totalItems ? Math.min(this.pageStart + this.pageSize, this.totalItems) : 0; }
  get pagedAgentes(): Agente[] { return this.agentesOrdenados.slice(this.pageStart, this.pageEnd); }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.clampPage();
    try { localStorage.setItem('agentes_pageSize', String(this.pageSize)); } catch { }
  }

  setPage(p: number) { this.currentPage = p; this.clampPage(); }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage += 1; }
  prevPage() { if (this.currentPage > 1) this.currentPage -= 1; }

  private clampPage() {
    if (this.totalItems === 0) { this.currentPage = 1; return; }
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
  }
}
