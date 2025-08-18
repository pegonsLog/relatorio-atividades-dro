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
        const atvId = this.strIdAtividade;
        this.itens = (list || [])
          .filter(i => String(i.idAtividade) === atvId)
          .sort((a, b) => (Number(a.idProdutividade) || 0) - (Number(b.idProdutividade) || 0));
      });
    });
  }

  ngOnDestroy(): void {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  // Helpers (IDs alfanuméricos do Firebase)
  get strIdAtividade(): string {
    const baseId: any = this.atividade?.idAtividade ?? this.idAtividade;
    return baseId != null ? String(baseId) : '';
  }

  get strIdRelatorio(): string {
    const baseId: any = this.atividade?.idRelatorio;
    return baseId != null ? String(baseId) : '';
  }

  get hasValidContext(): boolean {
    // Para criar item de produtividade, basta ter uma Atividade válida (idAtividade)
    return !!this.strIdAtividade;
  }

  get alertText(): string {
    switch (this.alertKey) {
      case 'missingContext':
        return 'Para criar um item de produtividade, é necessário ter uma Atividade válida (idAtividade).';
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
    const idRel = this.strIdRelatorio;
    if (idRel) {
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
        idRelatorio: this.strIdRelatorio,
        idAtividade: this.strIdAtividade,
      },
    });
  }
}
