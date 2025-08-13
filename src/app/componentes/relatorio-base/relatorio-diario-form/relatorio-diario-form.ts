import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RelatorioBase } from '../../../models';
import { RelatorioBaseService } from '../../../services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-relatorio-diario-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relatorio-diario-form.html',
  styleUrl: './relatorio-diario-form.scss'
})
export class RelatorioDiarioForm implements OnInit {
  @Input() relatorio?: RelatorioBase;
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<RelatorioBase>();
  @Output() formCancel = new EventEmitter<void>();

  relatorioForm: FormGroup;
  diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  turnos = ['Manhã', 'Tarde', 'Noite'];
  gerencias = ['Operações', 'Manutenção', 'Qualidade', 'Produção', 'Logística'];

  constructor(
    private fb: FormBuilder,
    private relatorioService: RelatorioBaseService
  ) {
    this.relatorioForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.relatorio && this.isEditMode) {
      this.loadRelatorio();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      gerencia: ['', [Validators.required]],
      data: ['', [Validators.required]],
      diaSemana: ['', [Validators.required]],
      turno: ['', [Validators.required]],
      mat1: ['', [Validators.required, Validators.min(1)]],
      mat2: ['', [Validators.required, Validators.min(1)]],
      coord: ['', [Validators.required, Validators.min(1)]],
      superv: ['', [Validators.required, Validators.min(1)]]
    });
  }

  private loadRelatorio(): void {
    if (this.relatorio) {
      this.relatorioForm.patchValue({
        gerencia: this.relatorio.gerencia,
        data: this.formatDateForInput(this.relatorio.data),
        diaSemana: this.relatorio.diaSemana,
        turno: this.relatorio.turno,
        mat1: this.relatorio.mat1,
        mat2: this.relatorio.mat2,
        coord: this.relatorio.coord,
        superv: this.relatorio.superv
      });
    }
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onDataChange(): void {
    const dataValue = this.relatorioForm.get('data')?.value;
    if (dataValue) {
      const data = new Date(dataValue);
      const diaSemana = this.diasSemana[data.getDay() === 0 ? 6 : data.getDay() - 1];
      this.relatorioForm.patchValue({ diaSemana });
    }
  }

  onSubmit(): void {
    if (this.relatorioForm.valid) {
      const formData = this.relatorioForm.value;
      const relatorioData: RelatorioBase = {
        ...formData,
        data: new Date(formData.data),
        idRelatorio: this.relatorio?.idRelatorio || 0
      };

      if (this.isEditMode && this.relatorio) {
        this.relatorioService.update(this.relatorio.idRelatorio, relatorioData);
      } else {
        this.relatorioService.create(relatorioData);
      }

      this.formSubmit.emit(relatorioData);
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
    this.relatorioForm.reset();
    this.relatorio = undefined;
    this.isEditMode = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.relatorioForm.controls).forEach(key => {
      const control = this.relatorioForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.relatorioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.relatorioForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['min']) return `${fieldName} deve ser maior que 0`;
    }
    return '';
  }
}
