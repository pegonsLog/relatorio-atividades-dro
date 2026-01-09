import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RelatorioBase } from '../../models';
import { RelatorioBaseService } from '../../services/relatorio-base.service';
import { UserContextService } from '../../services/user-context.service';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorios-coordenador',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeroIconComponent],
  templateUrl: './relatorios-coordenador.html',
  styleUrls: ['./relatorios-coordenador.scss']
})
export class RelatoriosCoordenadorComponent implements OnInit {
  private readonly service = inject(RelatorioBaseService);
  private readonly userCtx = inject(UserContextService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  relatorios: RelatorioBase[] = [];
  filteredRelatorios: RelatorioBase[] = [];
  loading = signal(false);

  // Filtros
  matriculaCoordenador = '';
  dataInicio = '';
  dataFim = '';

  // Modal
  showFilterModal = false;

  // Paginação
  page = 1;
  pageSize = 10;
  readonly pageSizes = [5, 10, 20, 50];

  // Ordenação
  sortKey: 'data' | 'gerencia' | 'turno' | 'coord' = 'data';
  sortDir: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    // Pré-preenche com a matrícula do usuário logado
    const userId = this.userCtx.getCurrentUserId();
    if (userId) {
      this.matriculaCoordenador = userId;
    }

    this.service.getRelatorios$().subscribe(list => {
      this.relatorios = list ?? [];
      // Reaplicar filtros se já existirem (após carregar dados)
      if (this.dataInicio && this.dataFim && this.matriculaCoordenador) {
        this.applyFiltersInternal();
      }
    });

    // Ler filtros da URL
    this.route.queryParamMap.subscribe(qp => {
      const coord = qp.get('coord');
      const di = qp.get('dataInicio');
      const df = qp.get('dataFim');

      if (coord && di && df) {
        this.matriculaCoordenador = coord;
        this.dataInicio = di;
        this.dataFim = df;
        this.showFilterModal = false;
        // Aplicar filtros se já temos dados
        if (this.relatorios.length > 0) {
          this.applyFiltersInternal();
        }
      } else {
        // Sem filtros na URL, abre o modal
        this.showFilterModal = true;
      }
    });
  }

  // Validação de data BR
  private isValidBRDate(s: string): boolean {
    if (!s) return false;
    const re = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!re.test(s.trim())) return false;
    const [dd, mm, yyyy] = s.split('/').map(n => Number(n));
    const d = new Date(yyyy, mm - 1, dd);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === yyyy && (d.getMonth() + 1) === mm && d.getDate() === dd;
  }

  private brToDate(s: string): Date | null {
    if (!this.isValidBRDate(s)) return null;
    const [dd, mm, yyyy] = s.split('/').map(n => Number(n));
    return new Date(yyyy, mm - 1, dd);
  }

  onDateInput(field: 'dataInicio' | 'dataFim', event: Event) {
    const input = event.target as HTMLInputElement;
    let v = (input.value || '').replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) {
      v = v.replace(/(\d{2})(\d{2})(\d{0,4}).*/, '$1/$2/$3');
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,2}).*/, '$1/$2');
    }
    input.value = v;
    this[field] = v;
  }

  get filtersValid(): boolean {
    if (!this.matriculaCoordenador.trim()) return false;
    if (!this.isValidBRDate(this.dataInicio) || !this.isValidBRDate(this.dataFim)) return false;
    const di = this.brToDate(this.dataInicio)!;
    const df = this.brToDate(this.dataFim)!;
    return di.getTime() <= df.getTime();
  }

  openFilterModal() {
    this.showFilterModal = true;
  }

  closeFilterModal() {
    this.showFilterModal = false;
  }

  applyFilters() {
    if (!this.filtersValid) return;
    
    // Salvar filtros na URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        coord: this.matriculaCoordenador,
        dataInicio: this.dataInicio,
        dataFim: this.dataFim
      },
      queryParamsHandling: 'merge'
    });

    this.applyFiltersInternal();
    this.showFilterModal = false;
  }

  private applyFiltersInternal() {
    if (!this.filtersValid) return;

    this.loading.set(true);
    const coordNum = Number(this.matriculaCoordenador);
    const di = this.brToDate(this.dataInicio)!;
    const df = this.brToDate(this.dataFim)!;
    // Ajusta fim do dia
    df.setHours(23, 59, 59, 999);

    this.filteredRelatorios = this.relatorios.filter(r => {
      const matchCoord = r.coord === coordNum;
      const dataRel = new Date(r.data);
      const matchData = dataRel >= di && dataRel <= df;
      return matchCoord && matchData;
    });

    this.page = 1;
    this.loading.set(false);
  }

  clearFilters() {
    this.matriculaCoordenador = this.userCtx.getCurrentUserId() || '';
    this.dataInicio = '';
    this.dataFim = '';
    this.filteredRelatorios = [];
    this.page = 1;
    
    // Limpar filtros da URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {}
    });
    
    this.showFilterModal = true;
  }

  // Ordenação
  get sorted(): RelatorioBase[] {
    const arr = [...this.filteredRelatorios];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: any, vb: any;
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
        case 'coord':
          va = a.coord ?? 0;
          vb = b.coord ?? 0;
          break;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }

  setSort(key: 'data' | 'gerencia' | 'turno' | 'coord') {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.goTo(1);
  }

  // Paginação
  get total(): number { return this.filteredRelatorios.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIndex(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  get pageItems(): RelatorioBase[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  goTo(p: number) {
    this.page = Math.min(this.totalPages, Math.max(1, p));
  }

  goToRelatorio(id: string | number | undefined) {
    if (id) {
      this.router.navigate(['/relatorio-base', id]);
    }
  }
}
