import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItemOcorrencia } from '../../../models';
import { ItemOcorrenciaService, RelatorioBaseService, TabelaOcorrenciasService } from '../../../services';

@Component({
  selector: 'app-item-ocorrencia-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './item-ocorrencia-form.html',
  styleUrls: ['./item-ocorrencia-form.scss']
})
export class ItemOcorrenciaForm implements OnInit {
  @Input() itemOcorrencia?: ItemOcorrencia;
  @Input() idRelatorio!: string;
  @Input() idAtividade!: string;
  @Input() dataRelatorio?: Date;
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<ItemOcorrencia>();
  @Output() formCancel = new EventEmitter<void>();

  ocorrenciaForm: FormGroup;
  codigosOcorrencias: Array<{ codigo: number; nome: string }> = [];

  constructor(
    private fb: FormBuilder,
    private ocorrenciaService: ItemOcorrenciaService,
    private relatorioBaseService: RelatorioBaseService,
    private tabelaService: TabelaOcorrenciasService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.ocorrenciaForm = this.createForm();
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      const id = Number(idParam);
      const item = this.ocorrenciaService.getById(id);
      if (item) {
        this.itemOcorrencia = item;
        this.idRelatorio = String(item.idRelatorio);
        this.idAtividade = String(item.idAtividade);
        this.loadItemOcorrencia();
      } else {
        this.navigateBack();
        return;
      }
    } else {
      const qp = this.route.snapshot.queryParamMap;
      if (!this.idRelatorio) {
        const ir = qp.get('idRelatorio');
        this.idRelatorio = ir ?? '';
      }
      if (!this.idAtividade) {
        const ia = qp.get('idAtividade');
        this.idAtividade = ia ?? '';
      }
      if (this.itemOcorrencia && this.isEditMode) {
        this.loadItemOcorrencia();
      }
    }

    if (!this.dataRelatorio && this.idRelatorio) {
      const rel = this.relatorioBaseService.getById(this.idRelatorio);
      if (rel?.data) this.dataRelatorio = rel.data instanceof Date ? rel.data : new Date(rel.data);
    }

    this.tabelaService.list().subscribe({
      next: (lista) => {
        this.codigosOcorrencias = (lista || []).map(o => ({ codigo: o.codigo, nome: o.nome }));
      },
      error: (e) => {
        console.error('Erro ao carregar tabela de ocorrências:', e);
        this.codigosOcorrencias = [];
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      codOcor: ['', [Validators.required]],
      qtdOcor: ['', [Validators.required, Validators.min(1)]]
    });
  }

  private loadItemOcorrencia(): void {
    if (this.itemOcorrencia) {
      this.ocorrenciaForm.patchValue({
        codOcor: this.itemOcorrencia.codOcor,
        qtdOcor: this.itemOcorrencia.qtdOcor
      });
    }
  }

  onSubmit(): void {
    if (this.ocorrenciaForm.valid) {
      const formData = this.ocorrenciaForm.value;
      const nomeOcorrencia = this.getDescricaoOcorrencia(formData.codOcor);
      const ocorrenciaData: ItemOcorrencia = {
        ...formData,
        idRelatorio: this.idRelatorio,
        idAtividade: this.idAtividade,
        idOcorrencia: this.itemOcorrencia?.idOcorrencia || 0,
        nomeOcorrencia: nomeOcorrencia || '',
        data: this.dataRelatorio instanceof Date ? this.dataRelatorio : new Date()
      };

      if (this.isEditMode && this.itemOcorrencia) {
        this.ocorrenciaService.update(this.itemOcorrencia.idOcorrencia, ocorrenciaData);
      } else {
        this.ocorrenciaService.create(ocorrenciaData);
      }

      this.formSubmit.emit(ocorrenciaData);
      this.resetForm();
      this.navigateBack();
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.formCancel.emit();
    this.navigateBack();
  }

  private resetForm(): void {
    this.ocorrenciaForm.reset();
    this.itemOcorrencia = undefined;
    this.isEditMode = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.ocorrenciaForm.controls).forEach(key => {
      const control = this.ocorrenciaForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.ocorrenciaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.ocorrenciaForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['min']) return `${fieldName} deve ser maior que 0`;
    }
    return '';
  }

  getDescricaoOcorrencia(codigo: any): string {
    const codeNum = Number(codigo);
    const ocor = this.codigosOcorrencias.find(o => o.codigo === codeNum);
    return ocor ? ocor.nome : '';
  }

  // Contexto obrigatório: idAtividade deve existir
  get hasContext(): boolean {
    return !!this.idAtividade;
  }

  private navigateBack(): void {
    if (this.idAtividade) {
      this.router.navigate(['/item-atividade', this.idAtividade], { queryParamsHandling: 'preserve' });
      return;
    }
    this.router.navigate(['/item-ocorrencia'], {
      queryParams: {
        idRelatorio: this.idRelatorio || undefined,
        idAtividade: this.idAtividade || undefined,
      },
      queryParamsHandling: 'merge',
    });
  }
}
