import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemAtividade } from '../../../models/item-atividade.interface';
import { ItemProdutividade } from '../../../models/item-produtividade.interface';
import { ItemAtividadeService } from '../../../services/item-atividade.service';
import { ItemProdutividadeService } from '../../../services/item-produtividade.service';

@Component({
  selector: 'app-item-atividade-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './item-atividade-detalhe.html',
  styleUrls: ['./item-atividade-detalhe.scss']
})
export class ItemAtividadeDetalhe implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly atividadeService = inject(ItemAtividadeService);
  private readonly prodService = inject(ItemProdutividadeService);

  idAtividade!: string;
  atividade: ItemAtividade | null = null;
  itens: ItemProdutividade[] = [];

  // UI
  loading = true;
  showAlert = false;
  alertKey: 'missingContext' | '' = '';
  private alertTimer: any = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const id = pm.get('id');
      if (!id) {
        this.router.navigate(['/item-atividade']);
        return;
      }
      this.idAtividade = id;

      // Carregar atividade
      this.atividadeService.getAtividades().subscribe(list => {
        this.atividade = (list || []).find(a => String(a.idAtividade) === this.idAtividade) || null;
        this.loading = false;
      });

      // Carregar itens de produtividade vinculados
      this.prodService.getItens().subscribe(list => {
        const atvNum = this.numericIdAtividade;
        this.itens = (list || []).filter(i => i.idAtividade === atvNum || String(i.idAtividade) === this.idAtividade);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  // Helpers
  get numericIdAtividade(): number {
    const baseId: any = this.atividade?.idAtividade ?? this.idAtividade;
    const n = Number(baseId);
    return Number.isFinite(n) ? n : 0;
  }

  get numericIdRelatorio(): number {
    const baseId: any = this.atividade?.idRelatorio;
    const n = Number(baseId);
    return Number.isFinite(n) ? n : 0;
  }

  get hasValidContext(): boolean {
    return this.numericIdRelatorio > 0 && this.numericIdAtividade > 0;
  }

  get alertText(): string {
    switch (this.alertKey) {
      case 'missingContext':
        return 'Para criar um item de produtividade, é necessário que a Atividade possua IDs numéricos válidos (idRelatorio e idAtividade).';
      default:
        return '';
    }
  }

  closeAlert() {
    this.showAlert = false;
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  voltarRelatorio(): void {
    const idRel = this.numericIdRelatorio;
    if (idRel > 0) {
      this.router.navigate(['/relatorio-base', idRel]);
    } else {
      this.router.navigate(['/relatorio-base']);
    }
  }

  novoItem(): void {
    if (!this.hasValidContext) {
      this.alertKey = 'missingContext';
      this.showAlert = true;
      if (this.alertTimer) clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(() => this.closeAlert(), 5000);
      return;
    }
    this.router.navigate(['/item-produtividade/novo'], {
      queryParams: {
        idRelatorio: this.numericIdRelatorio,
        idAtividade: this.numericIdAtividade,
      },
    });
  }
}
