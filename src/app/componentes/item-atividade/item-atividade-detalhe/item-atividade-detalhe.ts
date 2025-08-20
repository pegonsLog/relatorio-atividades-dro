import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemAtividade } from '../../../models/item-atividade.interface';
import { ItemProdutividade } from '../../../models/item-produtividade.interface';
import { ItemOcorrencia } from '../../../models/item-ocorrencia.interface';
import { ItemAtividadeService } from '../../../services/item-atividade.service';
import { ItemProdutividadeService } from '../../../services/item-produtividade.service';
import { ItemOcorrenciaService } from '../../../services/item-ocorrencia.service';

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
  private readonly ocorService = inject(ItemOcorrenciaService);

  idAtividade!: string;
  atividade: ItemAtividade | null = null;
  itens: ItemProdutividade[] = [];
  ocorrencias: ItemOcorrencia[] = [];

  // UI
  loading = true;
  showAlert = false;
  alertKey: 'missingContext' | '' = '';
  private alertTimer: any = null;
  // Modal exclusão de item de produtividade
  showDeleteModal = false;
  selectedItemId: number | null = null;
  deleting = false;
  // Modal exclusão de item de ocorrência
  showDeleteOcorModal = false;
  selectedOcorId: number | null = null;
  deletingOcor = false;

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

      // Carregar itens de ocorrência vinculados
      this.ocorService.getItens().subscribe(list => {
        const atvId = this.strIdAtividade;
        this.ocorrencias = (list || [])
          .filter(i => String(i.idAtividade) === atvId)
          .sort((a, b) => (Number(a.idOcorrencia) || 0) - (Number(b.idOcorrencia) || 0));
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
        return 'Para criar um item (produtividade/ocorrência), é necessário ter uma Atividade válida (idAtividade).';
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
      this.router.navigate(['/relatorio-base', idRel], { queryParamsHandling: 'preserve' });
    } else {
      this.router.navigate(['/relatorio-base'], { queryParamsHandling: 'preserve' });
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

  novoItemOcorrencia(): void {
    if (!this.hasValidContext) {
      this.alertKey = 'missingContext';
      this.showAlert = true;
      if (this.alertTimer) clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(() => this.closeAlert(), 5000);
      return;
    }
    this.router.navigate(['/item-ocorrencia/novo'], {
      queryParams: {
        idRelatorio: this.strIdRelatorio,
        idAtividade: this.strIdAtividade,
      },
      queryParamsHandling: 'merge'
    });
  }

  // Exclusão de item de produtividade
  get toDelete() {
    return this.selectedItemId;
  }

  openDelete(id: number): void {
    this.selectedItemId = id;
    this.showDeleteModal = true;
  }

  closeDelete() {
    this.closeDeleteModal();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedItemId = null;
    this.deleting = false;
  }

  async confirmDelete(): Promise<void> {
    if (this.selectedItemId === null) return;
    this.deleting = true;
    try {
      await Promise.resolve(this.prodService.delete(this.selectedItemId));
      this.closeDeleteModal();
    } catch (e) {
      console.error(e);
      this.deleting = false;
    }
  }

  // Exclusão de item de ocorrência
  openDeleteOcor(id: number): void {
    this.selectedOcorId = id;
    this.showDeleteOcorModal = true;
  }

  closeDeleteOcor() {
    this.closeDeleteOcorModal();
  }

  closeDeleteOcorModal() {
    this.showDeleteOcorModal = false;
    this.selectedOcorId = null;
    this.deletingOcor = false;
  }

  get toDeleteOcor() {
    return this.selectedOcorId;
  }

  async confirmDeleteOcor(): Promise<void> {
    if (this.selectedOcorId === null) return;
    this.deletingOcor = true;
    try {
      await Promise.resolve(this.ocorService.delete(this.selectedOcorId));
      this.closeDeleteOcorModal();
    } catch (e) {
      console.error(e);
      this.deletingOcor = false;
    }
  }
}
