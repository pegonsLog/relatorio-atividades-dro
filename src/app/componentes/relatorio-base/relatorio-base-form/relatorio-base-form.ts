import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RelatorioBase } from '../../../models';

@Component({
  selector: 'app-relatorio-base-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relatorio-base-form.html',
  styleUrls: ['./relatorio-base-form.scss']
})
export class RelatorioBaseFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() value?: RelatorioBase | null;
  @Input() saving = false;
  @Output() submitValue = new EventEmitter<RelatorioBase>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup = this.fb.group({
    idRelatorio: [''],
    gerencia: ['', [Validators.required, Validators.minLength(2)]],
    data: ['', [Validators.required]],
    diaSemana: ['', [Validators.required]],
    turno: ['', [Validators.required]],
    mat1: [0, [Validators.required]],
    mat2: [0, [Validators.required]],
    coord: [0, [Validators.required]],
    superv: [0, [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const v = this.value;
      if (v) {
        this.form.reset({
          idRelatorio: v.idRelatorio,
          gerencia: v.gerencia,
          data: this.toInputDate(v.data),
          diaSemana: v.diaSemana,
          turno: v.turno,
          mat1: v.mat1,
          mat2: v.mat2,
          coord: v.coord,
          superv: v.superv,
        });
      } else {
        this.form.reset({ idRelatorio: '', gerencia: '', data: '', diaSemana: '', turno: '', mat1: 0, mat2: 0, coord: 0, superv: 0 });
      }
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value as any;
    const payload: RelatorioBase = {
      idRelatorio: v.idRelatorio || 0,
      gerencia: v.gerencia,
      data: new Date(v.data),
      diaSemana: v.diaSemana,
      turno: v.turno,
      mat1: Number(v.mat1) || 0,
      mat2: Number(v.mat2) || 0,
      coord: Number(v.coord) || 0,
      superv: Number(v.superv) || 0,
    };
    this.submitValue.emit(payload);
  }

  onCancel() { this.cancel.emit(); }

  private toInputDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
