import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemOcorrencia } from '../../models';
import { HeroIconComponent } from '../../shared/icons/heroicons';

// Linha de resumo: quantitativo somado por código de ocorrência.
interface ResumoOcorrencia {
  key: number | string;
  nome: string;
  registros: number;
  quantidade: number;
}

// Recebe os itens já filtrados via @Input() e exibe os quantitativos
// somados por ocorrência (sem gráficos).
@Component({
  selector: 'app-graficos-ocorrencia',
  standalone: true,
  imports: [CommonModule, HeroIconComponent],
  templateUrl: './graficos-ocorrencia.html',
  styleUrls: ['./graficos-ocorrencia.scss']
})
export class GraficosOcorrenciaComponent implements OnChanges {
  @Input() items: ItemOcorrencia[] = [];

  resumo: ResumoOcorrencia[] = [];
  totalRegistros = 0;
  totalQuantidade = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.updateFromItems();
    }
  }

  // Agrega somando qtdOcor por código de ocorrência
  private updateFromItems(): void {
    const base = Array.isArray(this.items) ? this.items : [];
    const map = new Map<number | string, ResumoOcorrencia>();

    for (const i of base) {
      const key = i?.codOcor;
      if (key === undefined || key === null) continue;
      let linha = map.get(key);
      if (!linha) {
        linha = { key, nome: i.nomeOcorrencia || '', registros: 0, quantidade: 0 };
        map.set(key, linha);
      }
      linha.registros += 1;
      linha.quantidade += Number(i.qtdOcor) || 0;
      if (!linha.nome && i.nomeOcorrencia) linha.nome = i.nomeOcorrencia;
    }

    this.resumo = Array.from(map.values()).sort((a, b) => this.compareKeys(a.key, b.key));
    this.totalRegistros = this.resumo.reduce((s, r) => s + r.registros, 0);
    this.totalQuantidade = this.resumo.reduce((s, r) => s + r.quantidade, 0);
  }

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

  trackByKey(index: number, r: ResumoOcorrencia): number | string {
    return r.key;
  }
}
