import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RelatorioBase } from '../../../models';
import { RelatorioBaseService } from '../../../services/relatorio-base.service';
import { RelatorioBaseFormComponent } from '../relatorio-base-form/relatorio-base-form';

@Component({
  selector: 'app-relatorio-base-list',
  standalone: true,
  imports: [CommonModule, RelatorioBaseFormComponent],
  templateUrl: './relatorio-base-list.html',
  styleUrls: ['./relatorio-base-list.scss']
})
export class RelatorioBaseList implements OnInit {
  private readonly service = inject(RelatorioBaseService);

  relatorios$ = this.service.getRelatorios$();
  selected: RelatorioBase | null = null;
  saving = false;

  ngOnInit(): void {}

  startCreate(): void {
    this.selected = null;
  }

  startEdit(item: RelatorioBase): void {
    this.selected = item;
  }

  cancel(): void {
    this.selected = null;
  }

  onSubmit(payload: RelatorioBase): void {
    this.saving = true;
    if (this.selected && this.selected.idRelatorio) {
      this.service.update(this.selected.idRelatorio, payload);
    } else {
      this.service.create(payload);
    }
    this.saving = false;
    this.cancel();
  }

  delete(id: string | number): void {
    if (!id) return;
    if (confirm('Deseja realmente excluir este relatório?')) {
      this.service.delete(id);
      if (this.selected && this.selected.idRelatorio === id) this.cancel();
    }
  }
}
