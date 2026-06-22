import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemProdutividade } from '../../models';
import { HeroIconComponent } from '../../shared/icons/heroicons';

// Linha de resumo: contagem de registros por código de produtividade.
interface ResumoProdutividade {
  key: number | string;
  nome: string;
  registros: number;
}

// Recebe os itens já filtrados via @Input() e exibe o somatório de
// registros por produtividade (sem gráficos).
@Component({
  selector: 'app-graficos-produtividade',
  standalone: true,
  imports: [CommonModule, HeroIconComponent],
  templateUrl: './graficos-produtividade.html',
  styleUrls: ['./graficos-produtividade.scss']
})
export class GraficosProdutividadeComponent implements OnChanges {
  @Input() items: ItemProdutividade[] = [];

  resumo: ResumoProdutividade[] = [];
  totalRegistros = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.updateFromItems();
    }
  }

  // Agrega contando os registros por código de produtividade
  private updateFromItems(): void {
    const base = Array.isArray(this.items) ? this.items : [];
    const map = new Map<number | string, ResumoProdutividade>();

    for (const i of base) {
      const key = i?.codProd;
      if (key === undefined || key === null) continue;
      let linha = map.get(key);
      if (!linha) {
        linha = { key, nome: i.nomeProdutividade || '', registros: 0 };
        map.set(key, linha);
      }
      linha.registros += 1;
      if (!linha.nome && i.nomeProdutividade) linha.nome = i.nomeProdutividade;
    }

    this.resumo = Array.from(map.values()).sort((a, b) => this.compareKeys(a.key, b.key));
    this.totalRegistros = this.resumo.reduce((s, r) => s + r.registros, 0);
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

  trackByKey(index: number, r: ResumoProdutividade): number | string {
    return r.key;
  }
}
