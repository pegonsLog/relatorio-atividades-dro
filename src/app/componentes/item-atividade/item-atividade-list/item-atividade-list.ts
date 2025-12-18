import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemAtividadeService, RelatorioBaseService, ExportExcelService } from '../../../services';
import { ItemAtividade } from '../../../models';
import { GraficosAtividadesComponent } from '../../graficos-atividades/graficos-atividades';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-item-atividade-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GraficosAtividadesComponent, HeroIconComponent],
  templateUrl: './item-atividade-list.html',
  styleUrls: ['./item-atividade-list.scss']
})
export class ItemAtividadeList implements OnInit {
  filtro = '';
  atividades: ItemAtividade[] = [];
  // Loading
  loading = true;
  // Filtros originados do menu
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
  sortKey: 'idAtividade' | 'item' | 'local' | 'codAtv' | 'chegada' | 'nomeAtividade' | 'solucao' | 'saida' | 'qtdAgentes' | 'createdAt' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  // Modal de exclusão
  showDeleteModal = false;
  selectedItemId: string | number | null = null;
  deleting = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly atividadeService = inject(ItemAtividadeService);
  private readonly relService = inject(RelatorioBaseService);
  private readonly exportService = inject(ExportExcelService);



  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.filtro = qp.get('q') ?? '';
    // Filtros do menu
    this.isFromMenu = (qp.get('fromMenu') ?? '') !== '';
    this.dataInicioStr = qp.get('dataInicio');
    this.dataFimStr = qp.get('dataFim');
    this.filtroGerencia = qp.get('gerencia');
    this.filtroTurno = qp.get('turno');
    // Parse datas (considerando YYYY-MM-DD)
    if (this.dataInicioStr) {
      this.dataInicioDate = new Date(`${this.dataInicioStr}T00:00:00`);
    }

    if (this.dataFimStr) {
      this.dataFimDate = new Date(`${this.dataFimStr}T23:59:59.999`);
    }
    const p = Number(qp.get('page'));
    const ps = Number(qp.get('pageSize'));
    this.page = Number.isFinite(p) && p > 0 ? p : 1;
    this.pageSize = this.pageSizes.includes(ps) ? ps : this.pageSize;
    const sk = qp.get('sortKey') as any;
    const sd = qp.get('sortDir') as any;
    if (sk && ['idAtividade', 'item', 'local', 'codAtv', 'chegada', 'nomeAtividade', 'solucao', 'saida', 'qtdAgentes', 'createdAt'].includes(sk)) this.sortKey = sk;
    if (sd && ['asc', 'desc'].includes(sd)) this.sortDir = sd;

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

    // Carregar mapa de relatórios para filtros de gerência/turno
    this.relService.getRelatorios$().subscribe(relatorios => {
      this.relatorioMap.clear();
      for (const r of relatorios) {
        this.relatorioMap.set(r.idRelatorio!, { gerencia: r.gerencia || '', turno: r.turno || '' });
      }
    });
  }



  get filtrados(): ItemAtividade[] {
    const f = this.filtro.trim().toLowerCase();
    let base = this.atividades;
    // Filtro por período
    if (this.dataInicioDate) {
      base = base.filter(a => a.data && new Date(a.data).getTime() >= this.dataInicioDate!.getTime());
    }
    if (this.dataFimDate) {
      base = base.filter(a => a.data && new Date(a.data).getTime() <= this.dataFimDate!.getTime());
    }
    // Filtro por gerência/turno via idRelatorio
    if (this.filtroGerencia) {
      base = base.filter(a => {
        const meta = this.relatorioMap.get(a.idRelatorio);
        return meta ? String(meta.gerencia || '').toLowerCase() === String(this.filtroGerencia || '').toLowerCase() : false;
      });
    }
    if (this.filtroTurno) {
      base = base.filter(a => {
        const meta = this.relatorioMap.get(a.idRelatorio);
        return meta ? String(meta.turno || '').toLowerCase() === String(this.filtroTurno || '').toLowerCase() : false;
      });
    }
    // Filtro textual considerando colunas aparentes
    return base.filter(a => {
      if (!f) return true;
      const matchAlways =
        String(a.codAtv).includes(f) ||
        (a.nomeAtividade || '').toLowerCase().includes(f) ||
        String(a.item).includes(f) ||
        String(a.qtdAgentes ?? '').includes(f);
      const matchWhenVisible = !this.isFromMenu && (
        a.local.toLowerCase().includes(f) ||
        a.acionamento.toLowerCase().includes(f)
      );
      return matchAlways || matchWhenVisible;
    });
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
        case 'nomeAtividade':
          va = (a.nomeAtividade || '').toLowerCase(); vb = (b.nomeAtividade || '').toLowerCase(); break;
        case 'solucao':
          va = a.solucao ? new Date(a.solucao) : new Date(0); vb = b.solucao ? new Date(b.solucao) : new Date(0); break;
        case 'saida':
          va = a.saida ? new Date(a.saida) : new Date(0); vb = b.saida ? new Date(b.saida) : new Date(0); break;
        case 'qtdAgentes':
          va = a.qtdAgentes ?? 0; vb = b.qtdAgentes ?? 0; break;
        case 'createdAt':
          va = a.createdAt ? new Date(a.createdAt).getTime() : (a.chegada ? new Date(a.chegada).getTime() : 0);
          vb = b.createdAt ? new Date(b.createdAt).getTime() : (b.chegada ? new Date(b.chegada).getTime() : 0);
          break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  setSort(key: 'idAtividade' | 'item' | 'local' | 'codAtv' | 'chegada' | 'nomeAtividade' | 'solucao' | 'saida' | 'qtdAgentes' | 'createdAt') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'createdAt' ? 'desc' : 'asc';
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
      pageSize: this.pageSize !== 5 ? this.pageSize : undefined,
      sortKey: this.sortKey !== 'createdAt' ? this.sortKey : undefined,
      sortDir: this.sortDir !== 'desc' ? this.sortDir : undefined,
      // Preserva filtros vindos do menu
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
    const rows = this.sorted.map(a => ({
      'Item': a.item,
      'Local': a.local,
      'Acionamento': a.acionamento,
      'Código Atividade': a.codAtv,
      'Nome Atividade': a.nomeAtividade,
      'Chegada': this.formatDateTimeSafe(a.chegada),
      'Solução': this.formatDateTimeSafe(a.solucao),
      'Saída': this.formatDateTimeSafe(a.saida),
      'Data': this.formatDateSafe(a.data),
    }));
    const name = this.buildFileName('Atividades');
    this.exportService.exportAsExcel(rows, name, 'Atividades');
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

  private formatDateTimeSafe(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  private formatDateSafe(d: any): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
