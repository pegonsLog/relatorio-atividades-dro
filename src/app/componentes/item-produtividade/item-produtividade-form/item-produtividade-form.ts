import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ItemProdutividade } from '../../../models';
import { ItemProdutividadeService } from '../../../services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item-produtividade-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './item-produtividade-form.html',
  styleUrl: './item-produtividade-form.scss'
})
export class ItemProdutividadeForm implements OnInit {
  @Input() itemProdutividade?: ItemProdutividade;
  @Input() idRelatorio!: number;
  @Input() idAtividade!: number;
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
    private produtividadeService: ItemProdutividadeService
  ) {
    this.produtividadeForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.itemProdutividade && this.isEditMode) {
      this.loadItemProdutividade();
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
        idProdutividade: this.itemProdutividade?.idProdutividade || 0
      };

      if (this.isEditMode && this.itemProdutividade) {
        this.produtividadeService.update(this.itemProdutividade.idProdutividade, produtividadeData);
      } else {
        this.produtividadeService.create(produtividadeData);
      }

      this.formSubmit.emit(produtividadeData);
      this.resetForm();
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.formCancel.emit();
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

  getDescricaoProduto(codigo: number): string {
    const produto = this.codigosProdutos.find(p => p.codigo === codigo);
    return produto ? produto.descricao : '';
  }

  onCodigoProdutoChange(): void {
    const codigo = this.produtividadeForm.get('codProd')?.value;
    if (codigo) {
      // Pode adicionar lógica adicional quando o código do produto mudar
      console.log('Produto selecionado:', this.getDescricaoProduto(parseInt(codigo)));
    }
  }
}
