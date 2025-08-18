import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ItemProdutividade } from '../../../models';
import { ItemProdutividadeService } from '../../../services';

@Component({
  selector: 'app-item-produtividade-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './item-produtividade-detalhe.html',
  styleUrls: ['./item-produtividade-detalhe.scss']
})
export class ItemProdutividadeDetalhe implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ItemProdutividadeService);

  id!: number;
  item: ItemProdutividade | null = null;

  // UI
  loading = true;
  showAlert = false;
  private alertTimer: any = null;
  private sub: Subscription | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const idParam = pm.get('id');
      const id = Number(idParam);
      if (!Number.isFinite(id) || id <= 0) {
        this.router.navigate(['/item-produtividade']);
        return;
      }
      this.id = id;
      // Atualiza imediatamente e também reage a mudanças futuras
      this.item = this.service.getById(id) || null;
      if (this.sub) { this.sub.unsubscribe(); }
      this.sub = this.service.getItens().subscribe(() => {
        this.item = this.service.getById(this.id) || null;
      });
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
  }

  get hasContext(): boolean {
    return !!(this.item && this.item.idRelatorio && this.item.idAtividade);
  }

  get idRelatorio(): number | null { return this.item?.idRelatorio ?? null; }
  get idAtividade(): number | null { return this.item?.idAtividade ?? null; }

  voltarLista(): void { this.router.navigate(['/item-produtividade']); }

  voltarRelatorio(): void {
    if (this.idRelatorio) this.router.navigate(['/relatorio-base', this.idRelatorio]);
    else this.voltarLista();
  }

  voltarAtividade(): void {
    if (this.idAtividade != null) this.router.navigate(['/item-atividade', this.idAtividade]);
    else this.voltarLista();
  }

  editar(): void {
    const queryParams = this.hasContext ? { idRelatorio: this.idRelatorio!, idAtividade: this.idAtividade! } : undefined;
    this.router.navigate(['/item-produtividade', this.id, 'editar'], { queryParams });
  }

  novoItem(): void {
    if (!this.hasContext) {
      this.showAlert = true;
      if (this.alertTimer) clearTimeout(this.alertTimer);
      this.alertTimer = setTimeout(() => (this.showAlert = false), 5000);
      return;
    }
    this.router.navigate(['/item-produtividade/novo'], { queryParams: { idRelatorio: this.idRelatorio!, idAtividade: this.idAtividade! } });
  }

  excluir(): void {
    if (!this.item) return;
    const ok = this.service.delete(this.item.idProdutividade);
    if (ok) this.voltarLista();
  }
}
