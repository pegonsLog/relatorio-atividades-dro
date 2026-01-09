import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RelatorioBase, ItemAtividade, ItemProdutividade, ItemOcorrencia } from '../../../models';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { ItemAtividadeService } from '../../../services/item-atividade.service';
import { ItemProdutividadeService } from '../../../services/item-produtividade.service';
import { ItemOcorrenciaService } from '../../../services/item-ocorrencia.service';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorio-base-documento',
  standalone: true,
  imports: [CommonModule, RouterModule, HeroIconComponent],
  templateUrl: './relatorio-base-documento.html',
  styleUrls: ['./relatorio-base-documento.scss']
})
export class RelatorioBaseDocumento implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly relatorioService = inject(RelatorioBaseService);
  private readonly atividadeService = inject(ItemAtividadeService);
  private readonly produtividadeService = inject(ItemProdutividadeService);
  private readonly ocorrenciaService = inject(ItemOcorrenciaService);

  idRelatorio!: string;
  relatorio: RelatorioBase | null = null;
  atividades: ItemAtividade[] = [];
  produtividades: ItemProdutividade[] = [];
  ocorrencias: ItemOcorrencia[] = [];
  loading = true;
  readonly now = new Date();
  
  // Controle de acesso do coordenador
  fromCoord = false;
  updatingStatus = false;
  
  // Parâmetros para voltar ao coordenador
  private coordParams: { coord?: string; dataInicio?: string; dataFim?: string } = {};
  
  // Agregados por código
  aggProdutividades: { codProd: number; nome: string; total: number }[] = [];
  aggOcorrencias: { codOcor: number; nome: string; total: number }[] = [];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(qp => {
      this.fromCoord = qp.get('fromCoord') === '1';
      // Capturar parâmetros de filtro do coordenador
      const coord = qp.get('coord');
      const dataInicio = qp.get('dataInicio');
      const dataFim = qp.get('dataFim');
      if (coord) this.coordParams.coord = coord;
      if (dataInicio) this.coordParams.dataInicio = dataInicio;
      if (dataFim) this.coordParams.dataFim = dataFim;
    });

    this.route.paramMap.subscribe(pm => {
      const id = pm.get('id');
      if (!id) {
        this.router.navigate(['/relatorio-base'], { queryParamsHandling: 'preserve' });
        return;
      }
      this.idRelatorio = id;

      this.relatorioService.getRelatorios$().subscribe(list => {
        this.relatorio = list.find(r => String(r.idRelatorio) === id) || null;
        this.loading = false;
      });

      this.atividadeService.getAtividades().subscribe(list => {
        this.atividades = (list || []).filter(a => String(a.idRelatorio) === id);
      });

      this.produtividadeService.getItens().subscribe(list => {
        this.produtividades = (list || []).filter(p => String(p.idRelatorio) === id);
        this.aggregateProdutividade();
      });

      this.ocorrenciaService.getItens().subscribe(list => {
        this.ocorrencias = (list || []).filter(o => String(o.idRelatorio) === id);
        this.aggregateOcorrencia();
      });
    });
  }

  print(): void {
    window.print();
  }

  voltar(): void {
    if (this.fromCoord) {
      // Voltar para relatorios-coordenador com os filtros preservados
      this.router.navigate(['/relatorios-coordenador'], {
        queryParams: this.coordParams
      });
    } else {
      this.router.navigate(['/relatorio-base'], { queryParamsHandling: 'preserve' });
    }
  }

  // Atualizar status (apenas coordenador)
  async setStatus(status: 'pendente' | 'lido'): Promise<void> {
    if (!this.idRelatorio || this.updatingStatus) return;
    this.updatingStatus = true;
    try {
      await this.relatorioService.updateStatus(this.idRelatorio, status);
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    } finally {
      this.updatingStatus = false;
    }
  }

  // Helpers
  sumProdutividade(): number {
    return this.produtividades.reduce((acc, it) => acc + (Number(it.qtdProd) || 0), 0);
  }

  sumOcorrencias(): number {
    return this.ocorrencias.reduce((acc, it) => acc + (Number(it.qtdOcor) || 0), 0);
  }

  private aggregateProdutividade(): void {
    const map = new Map<number, { codProd: number; nome: string; total: number }>();
    for (const p of this.produtividades) {
      const cur = map.get(p.codProd) || { codProd: p.codProd, nome: p.nomeProdutividade, total: 0 };
      cur.total += Number(p.qtdProd) || 0;
      // mantém o primeiro nome encontrado
      map.set(p.codProd, cur);
    }
    this.aggProdutividades = Array.from(map.values()).sort((a, b) => a.codProd - b.codProd);
  }

  private aggregateOcorrencia(): void {
    const map = new Map<number, { codOcor: number; nome: string; total: number }>();
    for (const o of this.ocorrencias) {
      const cur = map.get(o.codOcor) || { codOcor: o.codOcor, nome: o.nomeOcorrencia, total: 0 };
      cur.total += Number(o.qtdOcor) || 0;
      map.set(o.codOcor, cur);
    }
    this.aggOcorrencias = Array.from(map.values()).sort((a, b) => a.codOcor - b.codOcor);
  }
}
