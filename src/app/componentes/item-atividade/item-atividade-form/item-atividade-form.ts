import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ItemAtividade } from '../../../models';
import { ItemAtividadeService } from '../../../services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item-atividade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './item-atividade-form.html',
  styleUrls: ['./item-atividade-form.scss']
})
export class ItemAtividadeForm implements OnInit {
  @Input() atividade?: ItemAtividade;
  @Input() idRelatorio!: number;
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<ItemAtividade>();
  @Output() formCancel = new EventEmitter<void>();

  atividadeForm: FormGroup;
  tiposAcionamento = ['Chamado via rádio', 'Solicitação direta', 'Rotina programada', 'Emergência', 'Manutenção preventiva'];

  constructor(
    private fb: FormBuilder,
    private atividadeService: ItemAtividadeService
  ) {
    this.atividadeForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.atividade && this.isEditMode) {
      this.loadAtividade();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      item: ['', [Validators.required, Validators.min(1)]],
      acionamento: ['', [Validators.required]],
      chegada: ['', [Validators.required]],
      solucao: ['', [Validators.required]],
      saida: ['', [Validators.required]],
      codAtv: ['', [Validators.required, Validators.min(1)]],
      codOcor: ['', [Validators.required, Validators.min(1)]],
      qtdAgentes: ['', [Validators.required, Validators.min(1)]],
      local: ['', [Validators.required, Validators.minLength(3)]],
      observacoes: ['', [Validators.maxLength(500)]]
    });
  }

  private loadAtividade(): void {
    if (this.atividade) {
      this.atividadeForm.patchValue({
        item: this.atividade.item,
        acionamento: this.atividade.acionamento,
        chegada: this.formatDateTimeForInput(this.atividade.chegada),
        solucao: this.formatDateTimeForInput(this.atividade.solucao),
        saida: this.formatDateTimeForInput(this.atividade.saida),
        codAtv: this.atividade.codAtv,
        codOcor: this.atividade.codOcor,
        qtdAgentes: this.atividade.qtdAgentes,
        local: this.atividade.local,
        observacoes: this.atividade.observacoes
      });
    }
  }

  private formatDateTimeForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onSubmit(): void {
    if (this.atividadeForm.valid) {
      const formData = this.atividadeForm.value;
      const atividadeData: ItemAtividade = {
        ...formData,
        chegada: new Date(formData.chegada),
        solucao: new Date(formData.solucao),
        saida: new Date(formData.saida),
        idRelatorio: this.idRelatorio,
        idAtividade: this.atividade?.idAtividade || 0
      };

      if (this.isEditMode && this.atividade) {
        this.atividadeService.update(this.atividade.idAtividade, atividadeData);
      } else {
        this.atividadeService.create(atividadeData);
      }

      this.formSubmit.emit(atividadeData);
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
    this.atividadeForm.reset();
    this.atividade = undefined;
    this.isEditMode = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.atividadeForm.controls).forEach(key => {
      const control = this.atividadeForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.atividadeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.atividadeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['min']) return `${fieldName} deve ser maior que 0`;
      if (field.errors['minlength']) return `${fieldName} deve ter pelo menos ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `${fieldName} deve ter no máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  // Validação para garantir que saída seja após chegada
  validateHorarios(): void {
    const chegada = this.atividadeForm.get('chegada')?.value;
    const solucao = this.atividadeForm.get('solucao')?.value;
    const saida = this.atividadeForm.get('saida')?.value;

    if (chegada && solucao && new Date(solucao) < new Date(chegada)) {
      this.atividadeForm.get('solucao')?.setErrors({ 'invalidTime': true });
    }

    if (solucao && saida && new Date(saida) < new Date(solucao)) {
      this.atividadeForm.get('saida')?.setErrors({ 'invalidTime': true });
    }
  }
}
