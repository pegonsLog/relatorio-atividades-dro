import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RelatorioBase } from '../../../models';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { ItemAtividade } from '../../../models/item-atividade.interface';
import { ItemAtividadeService } from '../../../services/item-atividade.service';
import { ItemAtividadeForm } from '../../item-atividade/item-atividade-form/item-atividade-form';

@Component({
  selector: 'app-relatorio-base-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, ItemAtividadeForm],
  templateUrl: './relatorio-base-detalhe.html',
  styleUrls: ['./relatorio-base-detalhe.scss']
})
export class RelatorioBaseDetalhe implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly relatorioService = inject(RelatorioBaseService);
  private readonly atividadeService = inject(ItemAtividadeService);

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
    });
  }

  get atividadesOrdenadas(): ItemAtividade[] {
    return [...this.atividades].sort((a, b) => (a.item || 0) - (b.item || 0));
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
