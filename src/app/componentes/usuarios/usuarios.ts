import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UsuariosService } from '../../services/usuarios.service';
import { Usuario } from '../../models/usuario.interface';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeroIconComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss'
})
export class Usuarios implements OnInit {
  filtro = '';
  usuarios: Usuario[] = [];
  loading = true;
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];
  sortKey: 'matricula' | 'nome' | 'senha' | 'perfil' | 'ativo' = 'matricula';
  sortDir: 'asc' | 'desc' = 'asc';
  showDeleteModal = false;
  toDelete?: number;
  deleting = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuariosService = inject(UsuariosService);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('q') ?? '';
    const p = Number(qp.get('page'));
    const ps = Number(qp.get('pageSize'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;

    this.usuariosService.list().subscribe({
      next: (list) => {
        this.usuarios = (list ?? []).map(u => ({ ...u, matricula: Number(u.matricula) }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filtrados(): Usuario[] {
    const f = this.filtro.trim().toLowerCase();
    return this.usuarios.filter(u => !f || u.nome.toLowerCase().includes(f) || String(u.matricula).includes(f));
  }

  get pageItems(): Usuario[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get total(): number { return this.filtrados.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIndex(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goTo(p: number) { this.page = Math.min(this.totalPages, Math.max(1, p)); }

  get sorted(): Usuario[] {
    const arr = [...this.filtrados];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: string | number | boolean = '';
      let vb: string | number | boolean = '';
      switch (this.sortKey) {
        case 'matricula': va = a.matricula; vb = b.matricula; break;
        case 'nome': va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break;
        case 'senha': va = a.senha.toLowerCase(); vb = b.senha.toLowerCase(); break;
        case 'perfil': va = a.perfil.toLowerCase(); vb = b.perfil.toLowerCase(); break;
        case 'ativo': va = a.ativo ? 1 : 0; vb = b.ativo ? 1 : 0; break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  setSort(key: 'matricula' | 'nome' | 'senha' | 'perfil' | 'ativo') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.goTo(1);
  }

  onFilterChange() { this.goTo(1); }
  clearFilter() { if (!this.filtro) return; this.filtro = ''; this.onFilterChange(); }

  openDelete(matricula: number) { this.toDelete = matricula; this.showDeleteModal = true; }
  closeDelete() { this.showDeleteModal = false; this.toDelete = undefined; this.deleting = false; }

  async confirmDelete() {
    if (!this.toDelete) return;
    this.deleting = true;
    try {
      await this.usuariosService.delete(this.toDelete);
      this.usuarios = this.usuarios.filter(u => u.matricula !== this.toDelete);
      this.closeDelete();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }
}
