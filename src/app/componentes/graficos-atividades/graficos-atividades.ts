import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemAtividade } from '../../models';
import { NgxChartsModule, ScaleType, Color } from '@swimlane/ngx-charts';

// Este componente agora é embutido e recebe os itens já filtrados via @Input().

@Component({
  selector: 'app-graficos-atividades',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './graficos-atividades.html',
  styleUrls: ['./graficos-atividades.scss']
})
export class GraficosAtividadesComponent implements AfterViewInit, OnChanges {
  // Entrada: itens já filtrados pelo componente pai
  @Input() items: ItemAtividade[] = [];

  // Grupos de gráficos: um por item
  chartGroups: Array<{ key: number | string; title: string; results: Array<{ name: string; value: number }> }> = [];

  // Esquema de cores para manter identidade visual atual
  colorScheme: Color = {
    name: 'dro-custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac']
  };

  ngAfterViewInit(): void {
    // Desenhar assim que as views estiverem disponíveis
    this.updateFromItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.updateFromItems();
    }
  }

  // Atualiza chartGroups a partir de items já filtrados, agregando por mês
  private updateFromItems() {
    const base = Array.isArray(this.items) ? this.items : [];
    // Mapa: codAtv -> (yyyymm -> contagem)
    const groupMap = new Map<number | string, Map<string, number>>();
    // Nome por codAtv
    const nameMap = new Map<number | string, string>();
    for (const a of base) {
      if (!a?.data) continue;
      const d = new Date(a.data);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      const ym = `${y}${String(m).padStart(2, '0')}`; // yyyymm
      const key = a.codAtv; // Agrupar por código de atividade
      if (!groupMap.has(key)) groupMap.set(key, new Map());
      const monthMap = groupMap.get(key)!;
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1); // Contagem de atividades
      if (!nameMap.has(key) && a.nomeAtividade) nameMap.set(key, a.nomeAtividade);
    }

    // Descobrir intervalo global de meses a partir de todos os grupos
    let minYM: string | null = null;
    let maxYM: string | null = null;
    for (const [, monthMap] of groupMap) {
      for (const ym of monthMap.keys()) {
        if (minYM === null || ym < minYM) minYM = ym;
        if (maxYM === null || ym > maxYM) maxYM = ym;
      }
    }

    // Montar lista de meses do intervalo global
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

    // Montar chartGroups ordenados por chave, preenchendo zeros para meses sem dados
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
