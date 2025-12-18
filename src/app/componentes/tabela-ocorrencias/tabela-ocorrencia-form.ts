import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TabelaOcorrenciasService } from '../../services/tabela-ocorrencias.service';
import { TabelaOcorrencia } from '../../models/tabela-ocorrencia.interface';
import { HeroIconComponent } from '../../shared/icons/heroicons';
import { of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-tabela-ocorrencia-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './tabela-ocorrencia-form.html',
  styleUrl: './tabela-ocorrencia-form.scss'
})
export class TabelaOcorrenciaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(TabelaOcorrenciasService);

  editing = false;
  codigoParam?: number;

  form = this.fb.group({
    codigo: [0, [Validators.required, Validators.min(1)]],
    nome: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(pm => {
          const param = pm.get('codigo');
          if (!param) return of(undefined);
          this.editing = true;
          this.codigoParam = Number(param);
          this.form.get('codigo')?.disable();
          return this.service.getByCodigo(this.codigoParam);
        }),
        take(1)
      )
      .subscribe((item) => {
        if (item) {
          const { codigo, nome } = item as TabelaOcorrencia;
          this.form.patchValue({ codigo, nome });
        } else if (this.editing) {
          this.router.navigate(['/tabela-ocorrencias']);
        }
      });
  }

  async salvar() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue() as TabelaOcorrencia;
    try {
      if (this.editing && this.codigoParam !== undefined) {
        await this.service.update(this.codigoParam, { nome: value.nome });
      } else {
        await this.service.create(value);
      }
      this.router.navigate(['/tabela-ocorrencias']);
    } catch (e) {
      console.error(e);
    }
  }

  cancelar() {
    this.router.navigate(['/tabela-ocorrencias']);
  }
}
