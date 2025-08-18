import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ItemProdutividade } from '../../../models';
import { ItemProdutividadeService, RelatorioBaseService } from '../../../services';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-item-produtividade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './item-produtividade-form.html',
  styleUrls: ['./item-produtividade-form.scss']
})
export class ItemProdutividadeForm implements OnInit {
  @Input() itemProdutividade?: ItemProdutividade;
  @Input() idRelatorio!: string;
  @Input() idAtividade!: string;
  @Input() dataRelatorio?: Date;
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<ItemProdutividade>();
  @Output() formCancel = new EventEmitter<void>();

  produtividadeForm: FormGroup;
  codigosProdutos = [
    { codigo: 301, descricao: 'Peças Montadas' },
    { codigo: 302, descricao: 'Inspeções Realizadas' },
    { codigo: 303, descricao: 'Reparos Executados' },
    { codigo: 304, descricao: 'Testes Concluídos' },
    { codigo: 305, descricao: 'Calibrações Feitas' }
  ];

  constructor(
    private fb: FormBuilder,
    private produtividadeService: ItemProdutividadeService,
    private relatorioBaseService: RelatorioBaseService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.produtividadeForm = this.createForm();
  }

  ngOnInit(): void {
    // Detectar modo edição via parâmetro de rota (/:id/editar)
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      const id = Number(idParam);
      const item = this.produtividadeService.getById(id);
      if (item) {
        this.itemProdutividade = item;
        // Preencher ids relacionados a partir do item
        this.idRelatorio = String(item.idRelatorio);
        this.idAtividade = String(item.idAtividade);
        this.loadItemProdutividade();
      } else {
        // Item não encontrado, retornar para lista
        this.navigateBack();
        return;
      }
    } else {
      // Modo criação: tentar obter ids via query params, se não vierem por @Input
      const qp = this.route.snapshot.queryParamMap;
      if (this.idRelatorio === undefined || this.idRelatorio === null || this.idRelatorio === '') {
        const ir = qp.get('idRelatorio');
        this.idRelatorio = ir ?? '';
      }
      if (this.idAtividade === undefined || this.idAtividade === null || this.idAtividade === '') {
        const ia = qp.get('idAtividade');
        this.idAtividade = ia ?? '';
      }
      if (this.itemProdutividade && this.isEditMode) {
        this.loadItemProdutividade();
      }
    }

    // Preencher dataRelatorio a partir do serviço caso não seja fornecida via @Input
    if (!this.dataRelatorio && this.idRelatorio) {
      const rel = this.relatorioBaseService.getById(this.idRelatorio);
      if (rel?.data) this.dataRelatorio = rel.data instanceof Date ? rel.data : new Date(rel.data);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      codProd: ['', [Validators.required]],
      qtdProd: ['', [Validators.required, Validators.min(1)]]
    });
  }

  private loadItemProdutividade(): void {
    if (this.itemProdutividade) {
      this.produtividadeForm.patchValue({
        codProd: this.itemProdutividade.codProd,
        qtdProd: this.itemProdutividade.qtdProd
      });
    }
  }

  onSubmit(): void {
    if (this.produtividadeForm.valid) {
      const formData = this.produtividadeForm.value;
      const produtividadeData: ItemProdutividade = {
        ...formData,
        idRelatorio: this.idRelatorio,
        idAtividade: this.idAtividade,
        idProdutividade: this.itemProdutividade?.idProdutividade || 0,
        // Usa a data do relatório-base
        data: this.dataRelatorio instanceof Date ? this.dataRelatorio : new Date()
      };

      if (this.isEditMode && this.itemProdutividade) {
        this.produtividadeService.update(this.itemProdutividade.idProdutividade, produtividadeData);
      } else {
        this.produtividadeService.create(produtividadeData);
      }

      this.formSubmit.emit(produtividadeData);
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
    this.produtividadeForm.reset();
    this.itemProdutividade = undefined;
    this.isEditMode = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.produtividadeForm.controls).forEach(key => {
      const control = this.produtividadeForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.produtividadeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.produtividadeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['min']) return `${fieldName} deve ser maior que 0`;
    }
    return '';
  }

  getDescricaoProduto(codigo: any): string {
    const codeNum = Number(codigo);
    const produto = this.codigosProdutos.find(p => p.codigo === codeNum);
    return produto ? produto.descricao : '';
  }

  onCodigoProdutoChange(): void {
    const codigo = this.produtividadeForm.get('codProd')?.value;
    if (codigo) {
      // Pode adicionar lógica adicional quando o código do produto mudar
      // console removido
    }
  }

  // Contexto obrigatório: idRelatorio e idAtividade devem existir (>0)
  get hasContext(): boolean {
    // Para criar o item de produtividade, o obrigatório é pertencer a uma Atividade
    return !!this.idAtividade;
  }

  private navigateBack(): void {
    if (this.idAtividade) {
      this.router.navigate(['/item-atividade', this.idAtividade]);
      return;
    }
    this.router.navigate(['/item-produtividade'], {
      queryParams: {
        idRelatorio: this.idRelatorio || undefined,
        idAtividade: this.idAtividade || undefined,
      }
    });
  }
}
