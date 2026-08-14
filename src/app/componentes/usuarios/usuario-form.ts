import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsuariosService } from '../../services/usuarios.service';
import { Usuario } from '../../models/usuario.interface';
import { LOTACOES } from '../../shared/lotacoes';
import { HeroIconComponent } from '../../shared/icons/heroicons';
import { of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.scss'
})
export class UsuarioForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(UsuariosService);

  editing = false;
  matriculaParam?: number;

  form = this.fb.group({
    matricula: [0, [Validators.required, Validators.min(1)]],
    nome: ['', [Validators.required, Validators.minLength(2)]],
    senha: ['', [Validators.required]],
    perfil: ['Usuário', [Validators.required]],
    lotacao: [''],
    ativo: [true]
  });

  /** Sugestões de lotação (campo é texto livre, aceita valores fora da lista) */
  readonly lotacoes = LOTACOES;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(pm => {
          const param = pm.get('matricula');
          if (!param) return of(undefined);
          this.editing = true;
          this.matriculaParam = Number(param);
          this.form.get('matricula')?.disable();
          return this.service.getByMatricula(this.matriculaParam);
        }),
        take(1)
      )
      .subscribe((u) => {
        if (u) {
          const perfilRaw = (u as any).perfil as string;
          const perfilNorm: Usuario['perfil'] = perfilRaw === 'Admin' ? 'Admin' : perfilRaw === 'Usuário Avançado' ? 'Usuário Avançado' : (perfilRaw === 'Usuario' ? 'Usuário' : 'Usuário');
          const { matricula, nome, senha, ativo, lotacao } = u as Usuario;
          // Usuários cadastrados antes da lotação existir vêm sem o campo
          this.form.patchValue({ matricula, nome, senha, perfil: perfilNorm, ativo, lotacao: lotacao || '' });
        } else if (this.editing) {
          this.router.navigate(['/usuarios']);
        }
      });
  }

  async salvar() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue() as Usuario;
    try {
      if (this.editing && this.matriculaParam) {
        await this.service.update(this.matriculaParam, {
          nome: value.nome,
          senha: value.senha,
          perfil: value.perfil,
          lotacao: value.lotacao ?? '',
          ativo: value.ativo,
        });
      } else {
        await this.service.create(value);
      }
      this.router.navigate(['/usuarios']);
    } catch (e) { console.error(e); }
  }

  cancelar() { this.router.navigate(['/usuarios']); }
}
