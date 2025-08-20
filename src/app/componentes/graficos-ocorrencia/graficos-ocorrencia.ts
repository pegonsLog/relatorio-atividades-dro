import { AfterViewInit, Component, ElementRef, ViewChildren, Input, OnChanges, SimpleChanges, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemOcorrencia } from '../../models';

@Component({
  selector: 'app-graficos-ocorrencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graficos-ocorrencia.html',
  styleUrls: ['./graficos-ocorrencia.scss']
})
export class GraficosOcorrenciaComponent implements AfterViewInit, OnChanges {
  @Input() items: ItemOcorrencia[] = [];

  // Grupos: um gráfico por código de ocorrência
  chartGroups: Array<{ key: number | string; title: string; labels: string[]; counts: number[] }> = [];

  @ViewChildren('chartCanvas') canvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

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
    // Mapa: codOcor -> (yyyymm -> soma)
    const groupMap = new Map<number | string, Map<string, number>>();
    const nameMap = new Map<number | string, string>();
    for (const i of base) {
      if (!i?.data) continue;
      const d = new Date(i.data);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}${String(m).padStart(2, '0')}`;
      const key = i.codOcor;
      if (!groupMap.has(key)) groupMap.set(key, new Map());
      const monthMap = groupMap.get(key)!;
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + (Number(i.qtdOcor) || 0));
      if (!nameMap.has(key) && i.nomeOcorrencia) nameMap.set(key, i.nomeOcorrencia);
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
      const labels = months.map(ym => `${ym.slice(4, 6)}/${ym.slice(0, 4)}`);
      const counts = months.map(ym => monthMap.get(ym) ?? 0);
      const nome = nameMap.get(key);
      const title = nome ? `${key} — ${nome}` : String(key);
      return { key, title, labels, counts };
    });

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
    ctx.font = '12px Montserrat, sans-serif';

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (counts.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px Montserrat, sans-serif';
      ctx.fillText('Sem dados para exibir', 20, 30);
      return;
    }

    const margin = { top: 20, right: 20, bottom: 80, left: 50 };
    const gw = W - margin.left - margin.right;
    const gh = H - margin.top - margin.bottom;

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, H - margin.bottom);
    ctx.lineTo(W - margin.right, H - margin.bottom);
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, H - margin.bottom);
    ctx.stroke();

    const maxVal = Math.max(...counts, 1);
    const n = counts.length;
    const gap = 10;
    const barW = Math.max(10, (gw - gap * (n + 1)) / n);

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

    const colors = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'];

    for (let i = 0; i < n; i++) {
      const x = margin.left + gap + i * (barW + gap);
      const h = (counts[i] / maxVal) * gh;
      const y = H - margin.bottom - h;
      const color = colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, h);

      const lbl = labels[i];
      ctx.save();
      ctx.translate(x + barW / 2, H - margin.bottom + 14);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, 0, 0);
      ctx.restore();

      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.fillText(String(counts[i]), x + barW / 2, y - 4);
    }
  }
}
