import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RelatorioBase } from '../../../models';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { ItemAtividade } from '../../../models/item-atividade.interface';
import { ItemAtividadeService } from '../../../services/item-atividade.service';
import { ItemAtividadeForm } from '../../item-atividade/item-atividade-form/item-atividade-form';
import { ItemProdutividadeService } from '../../../services/item-produtividade.service';
import { ItemOcorrenciaService } from '../../../services/item-ocorrencia.service';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorio-base-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, ItemAtividadeForm, HeroIconComponent],
  templateUrl: './relatorio-base-detalhe.html',
  styleUrls: ['./relatorio-base-detalhe.scss']
})
export class RelatorioBaseDetalhe implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly relatorioService = inject(RelatorioBaseService);
  private readonly atividadeService = inject(ItemAtividadeService);
  private readonly produtividadeService = inject(ItemProdutividadeService);
  private readonly ocorrenciaService = inject(ItemOcorrenciaService);

  idRelatorio!: string;
  relatorio: RelatorioBase | null = null;
  atividades: ItemAtividade[] = [];
  showForm = false;
  loading = true;
  editAtividade: ItemAtividade | null = null;
  // Modal de exclusão
  showDeleteModal = false;
  toDelete: string | number | null = null;
  deleting = false;
  // Contagens por atividade
  contagemProd: { [idAtividade: string]: number } = {};
  contagemOcor: { [idAtividade: string]: number } = {};

  ngOnInit(): void {
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

      // Subscrever itens de produtividade e ocorrência para manter contagens atualizadas
      this.produtividadeService.getItens().subscribe(itens => {
        const map: { [k: string]: number } = {};
        for (const it of itens || []) {
          const key = String((it as any).idAtividade ?? '');
          if (key) map[key] = (map[key] || 0) + 1;
        }
        this.contagemProd = map;
      });

      this.ocorrenciaService.getItens().subscribe(itens => {
        const map: { [k: string]: number } = {};
        for (const it of itens || []) {
          const key = String((it as any).idAtividade ?? '');
          if (key) map[key] = (map[key] || 0) + 1;
        }
        this.contagemOcor = map;
      });
    });
  }

  get atividadesOrdenadas(): ItemAtividade[] {
    return [...this.atividades].sort((a, b) => {
      const ta = (a?.createdAt ? new Date(a.createdAt).getTime() : a?.chegada ? new Date(a.chegada).getTime() : 0);
      const tb = (b?.createdAt ? new Date(b.createdAt).getTime() : b?.chegada ? new Date(b.chegada).getTime() : 0);
      // Descrescente: mais recente primeiro
      return tb - ta;
    });
  }

  get numericIdRelatorio(): number {
    const baseId: any = this.relatorio?.idRelatorio ?? this.idRelatorio;
    const n = Number(baseId);
    return Number.isFinite(n) ? n : 0;
  }

  abrirForm(): void {
    this.showForm = true;
  }

  fecharForm(): void {
    this.showForm = false;
    this.editAtividade = null;
  }

  onAtividadeCriada(_atv: ItemAtividade): void {
    // O serviço já atualiza a lista via BehaviorSubject
    this.showForm = false;
    this.editAtividade = null;
  }

  editarAtividade(a: ItemAtividade): void {
    this.editAtividade = a;
    this.showForm = true;
  }

  toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // Quantidades por atividade
  getQtdProd(a: ItemAtividade): number {
    const key = String(a?.idAtividade ?? '');
    return this.contagemProd[key] || 0;
  }

  getQtdOcor(a: ItemAtividade): number {
    const key = String(a?.idAtividade ?? '');
    return this.contagemOcor[key] || 0;
  }

  // Modal de exclusão de atividade
  openDelete(id: string | number): void {
    this.toDelete = id;
    this.showDeleteModal = true;
  }

  closeDelete(): void {
    this.showDeleteModal = false;
    this.toDelete = null;
    this.deleting = false;
  }

  async confirmDelete(): Promise<void> {
    if (this.toDelete == null) return;
    this.deleting = true;
    try {
      await Promise.resolve(this.atividadeService.delete(this.toDelete));
      this.closeDelete();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }
}
