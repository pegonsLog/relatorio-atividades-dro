import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Agente } from '../../models/agente.interface';
import { AgentesService } from '../../services/agentes.service';

@Component({
  selector: 'app-agente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agente.html',
  styleUrl: './agente.scss'
})
export class AgenteComponent implements OnInit {
  agentes: Agente[] = [];
  agentesFiltrados: Agente[] = [];
  filtro = '';
  // Ordenação
  sortKey: 'matricula' | 'nome' | 'cargo' | 'turno' | 'gerencia' = 'matricula';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(private agentesService: AgentesService) {}

  ngOnInit(): void {
    this.agentesService.list().subscribe(list => {
      this.agentes = (list ?? []).map(a => ({ ...a, matricula: Number(a.matricula) }));
      this.applyFilter();
    });
  }

  async delete(matricula: number) {
    try {
      await this.agentesService.delete(matricula);
    } catch (e) {
      console.error(e);
    }
  }

  onFilterChange() {
    this.applyFilter();
  }

  clearFilter() {
    this.filtro = '';
    this.applyFilter();
  }

  private applyFilter() {
    const f = (this.filtro || '').toLowerCase().trim();
    if (!f) {
      this.agentesFiltrados = [...this.agentes];
      return;
    }
    this.agentesFiltrados = this.agentes.filter(a => {
      const nome = (a.nome || '').toLowerCase();
      const mat = String(a.matricula || '').toLowerCase();
      return nome.includes(f) || mat.includes(f);
    });
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

  setSort(key: 'matricula' | 'nome' | 'cargo' | 'turno' | 'gerencia') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }
}
