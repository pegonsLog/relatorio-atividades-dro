import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemAtividade } from '../../models';
import { HeroIconComponent } from '../../shared/icons/heroicons';

// Linha de resumo: contagem de registros por código de atividade.
interface ResumoAtividade {
  key: number | string;
  nome: string;
  registros: number;
}

// Este componente recebe os itens já filtrados via @Input() e exibe o
// somatório de registros por atividade (sem gráficos).
@Component({
  selector: 'app-graficos-atividades',
  standalone: true,
  imports: [CommonModule, HeroIconComponent],
  templateUrl: './graficos-atividades.html',
  styleUrls: ['./graficos-atividades.scss']
})
export class GraficosAtividadesComponent implements OnChanges {
  // Entrada: itens já filtrados pelo componente pai
  @Input() items: ItemAtividade[] = [];

  // Resumo agregado por código de atividade
  resumo: ResumoAtividade[] = [];
  totalRegistros = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.updateFromItems();
    }
  }

  // Agrega contando os registros por código de atividade
  private updateFromItems(): void {
    const base = Array.isArray(this.items) ? this.items : [];
    const map = new Map<number | string, ResumoAtividade>();

    for (const a of base) {
      const key = a?.codAtv;
      if (key === undefined || key === null) continue;
      let linha = map.get(key);
      if (!linha) {
        linha = { key, nome: a.nomeAtividade || '', registros: 0 };
        map.set(key, linha);
      }
      linha.registros += 1;
      if (!linha.nome && a.nomeAtividade) linha.nome = a.nomeAtividade;
    }

    this.resumo = Array.from(map.values()).sort((a, b) => this.compareKeys(a.key, b.key));
    this.totalRegistros = this.resumo.reduce((s, r) => s + r.registros, 0);
  }

  // Ordena numericamente quando possível, com fallback alfabético
  private compareKeys(a: number | string, b: number | string): number {
    const toNum = (v: number | string) => {
      if (typeof v === 'number') return v;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };
    const an = toNum(a);
    const bn = toNum(b);
    if (an !== null && bn !== null) return an - bn;
    return String(a).localeCompare(String(b));
  }

  trackByKey(index: number, r: ResumoAtividade): number | string {
    return r.key;
  }
}
