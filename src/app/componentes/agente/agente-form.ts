import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentesService } from '../../services/agentes.service';
import { Agente } from '../../models/agente.interface';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-agente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './agente-form.html',
  styleUrl: './agente-form.scss'
})
export class AgenteForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AgentesService);

  editing = false;
  matriculaParam?: number;

  form = this.fb.group({
    matricula: [0, [Validators.required, Validators.min(1)]],
    nome: ['', [Validators.required, Validators.minLength(2)]],
    cargo: ['', [Validators.required]],
    turno: ['', [Validators.required]],
    gerencia: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('matricula');
    if (param) {
      this.editing = true;
      this.matriculaParam = Number(param);
      this.form.get('matricula')?.disable();
      this.service.getByMatricula(this.matriculaParam).subscribe((a) => {
        if (a) {
          const { matricula, nome, cargo, turno, gerencia } = a as Agente;
          this.form.patchValue({ matricula, nome, cargo, turno, gerencia });
        } else {
          this.router.navigate(['/agente']);
        }
      });
    }
  }

  async salvar() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue() as Agente;
    try {
      if (this.editing && this.matriculaParam) {
        await this.service.update(this.matriculaParam, {
          nome: value.nome,
          cargo: value.cargo,
          turno: value.turno,
          gerencia: value.gerencia,
        });
      } else {
        await this.service.create(value);
      }
      this.router.navigate(['/agente']);
    } catch (e) { console.error(e); }
  }

  cancelar() { this.router.navigate(['/agente']); }
}
