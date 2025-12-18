import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemProdutividade } from '../../models';
import { NgxChartsModule, ScaleType, Color } from '@swimlane/ngx-charts';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-graficos-produtividade',
  standalone: true,
  imports: [CommonModule, NgxChartsModule, HeroIconComponent],
  templateUrl: './graficos-produtividade.html',
  styleUrls: ['./graficos-produtividade.scss']
})
export class GraficosProdutividadeComponent implements AfterViewInit, OnChanges {
  @Input() items: ItemProdutividade[] = [];

  // Grupos: um gráfico por código de produtividade
  chartGroups: Array<{ key: number | string; title: string; results: Array<{ name: string; value: number }> }> = [];

  colorScheme: Color = {
    name: 'dro-custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac']
  };

  ngAfterViewInit(): void {
    this.updateFromItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.updateFromItems();
    }
  }

  private updateFromItems() {
    const base = Array.isArray(this.items) ? this.items : [];
    // Mapa: codProd -> (yyyymm -> soma)
    const groupMap = new Map<number | string, Map<string, number>>();
    // Também mapear título (nome) por codProd
    const nameMap = new Map<number | string, string>();
    for (const i of base) {
      if (!i?.data) continue;
      const d = new Date(i.data);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}${String(m).padStart(2, '0')}`;
      const key = i.codProd;
      if (!groupMap.has(key)) groupMap.set(key, new Map());
      const monthMap = groupMap.get(key)!;
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + (Number(i.qtdProd) || 0));
      if (!nameMap.has(key) && i.nomeProdutividade) nameMap.set(key, i.nomeProdutividade);
    }

    // Intervalo global de meses (minYM..maxYM) baseado nos dados filtrados
    let minYM: string | null = null;
    let maxYM: string | null = null;
    for (const [, monthMap] of groupMap) {
      for (const ym of monthMap.keys()) {
        if (minYM === null || ym < minYM) minYM = ym;
        if (maxYM === null || ym > maxYM) maxYM = ym;
      }
    }
    const months: string[] = [];
    if (minYM && maxYM) {
      let cur = minYM;
      while (true) {
        months.push(cur);
        if (cur === maxYM) break;
        let y = Number(cur.slice(0, 4));
        let m = Number(cur.slice(4, 6));
        m++;
        if (m > 12) { m = 1; y++; }
        cur = `${y}${String(m).padStart(2, '0')}`;
      }
    }

    const groups = Array.from(groupMap.entries()).sort((a, b) => {
      const toNum = (v: any) => {
        if (typeof v === 'number') return v;
        const n = Number(v as any);
        return isNaN(n) ? null : n;
      };
      const an = toNum(a[0]);
      const bn = toNum(b[0]);
      if (an !== null && bn !== null) return an - bn; // ordem numérica
      return String(a[0]).localeCompare(String(b[0])); // fallback alfabético
    });
    this.chartGroups = groups.map(([key, monthMap]) => {
      const results = months.map(ym => ({
        name: `${ym.slice(4, 6)}/${ym.slice(0, 4)}`,
        value: monthMap.get(ym) ?? 0
      }));
      const nome = nameMap.get(key);
      const title = nome ? `${key} — ${nome}` : String(key);
      return { key, title, results };
    });
  }

  trackByKey(index: number, g: { key: number | string }): number | string {
    return g.key;
  }
}
