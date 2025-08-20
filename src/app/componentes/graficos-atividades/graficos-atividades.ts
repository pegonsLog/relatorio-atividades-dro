import { AfterViewInit, Component, ElementRef, ViewChildren, Input, OnChanges, SimpleChanges, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemAtividade } from '../../models';

// Este componente agora é embutido e recebe os itens já filtrados via @Input().

@Component({
  selector: 'app-graficos-atividades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graficos-atividades.html',
  styleUrls: ['./graficos-atividades.scss']
})
export class GraficosAtividadesComponent implements AfterViewInit, OnChanges {
  // Entrada: itens já filtrados pelo componente pai
  @Input() items: ItemAtividade[] = [];

  // Grupos de gráficos: um por item
  chartGroups: Array<{ key: number | string; title: string; labels: string[]; counts: number[] }> = [];

  @ViewChildren('chartCanvas') canvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

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
      const monthValueMap = monthMap; // valores agregados por yyyymm
      const labels = months.map(ym => `${ym.slice(4, 6)}/${ym.slice(0, 4)}`);
      const counts = months.map(ym => monthValueMap.get(ym) ?? 0);
      const nome = nameMap.get(key);
      const title = nome ? `${key} — ${nome}` : String(key);
      return { key, title, labels, counts };
    });

    // Desenhar após o Angular renderizar os canvases
    setTimeout(() => this.drawAllCharts(), 0);
  }

  private drawAllCharts() {
    if (!this.canvasRefs) return;
    const refs = this.canvasRefs.toArray();
    for (let i = 0; i < this.chartGroups.length; i++) {
      const canvas = refs[i]?.nativeElement;
      if (!canvas) continue;
      const { labels, counts } = this.chartGroups[i];
      this.drawChart(canvas, labels, counts);
    }
  }

  trackByKey(index: number, g: { key: number | string }): number | string {
    return g.key;
  }

  private drawChart(canvas: HTMLCanvasElement, labels: string[], counts: number[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Fonte padrão do canvas alinhada ao app (Montserrat)
    ctx.font = '12px Montserrat, sans-serif';

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Sem dados
    if (counts.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px Montserrat, sans-serif';
      ctx.fillText('Sem dados para exibir', 20, 30);
      return;
    }

    // Margens e área do gráfico
    const margin = { top: 20, right: 20, bottom: 80, left: 50 };
    const gw = W - margin.left - margin.right;
    const gh = H - margin.top - margin.bottom;

    // Eixos
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // eixo X
    ctx.moveTo(margin.left, H - margin.bottom);
    ctx.lineTo(W - margin.right, H - margin.bottom);
    // eixo Y
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, H - margin.bottom);
    ctx.stroke();

    // Escalas
    const maxVal = Math.max(...counts, 1);
    const n = counts.length;
    const gap = 10;
    const barW = Math.max(10, (gw - gap * (n + 1)) / n);

    // Grades Y e labels Y (0, 25%, 50%, 75%, 100%)
    ctx.fillStyle = '#444';
    ctx.font = '12px Montserrat, sans-serif';
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxVal * i) / steps);
      const y = H - margin.bottom - (gh * i) / steps;
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(W - margin.right, y);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.fillText(String(val), 5, y - 2);
    }

    // Cores
    const colors = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];

    // Desenhar barras e labels X
    for (let i = 0; i < n; i++) {
      const x = margin.left + gap + i * (barW + gap);
      const h = (counts[i] / maxVal) * gh;
      const y = H - margin.bottom - h;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, barW, h);

      // label X (rotacionada se necessário)
      const lbl = labels[i];
      ctx.save();
      ctx.translate(x + barW / 2, H - margin.bottom + 14);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, 0, 0);
      ctx.restore();

      // valor acima da barra
      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.fillText(String(counts[i]), x + barW / 2, y - 4);
    }
  }
}
