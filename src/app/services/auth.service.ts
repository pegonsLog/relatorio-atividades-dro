import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UsuariosService } from './usuarios.service';
import { Usuario } from '../models/usuario.interface';
import { UserContextService } from './user-context.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarios = inject(UsuariosService);
  private readonly userContext = inject(UserContextService);
  private readonly router = inject(Router);

  async login(matricula: number, senha: string): Promise<Usuario> {
    const usuario = await firstValueFrom(this.usuarios.getByMatricula(matricula));
    if (!usuario) throw new Error('Usuário não encontrado');
    if (!usuario.ativo) throw new Error('Usuário inativo');
    if (usuario.senha !== senha) throw new Error('Senha inválida');

    // Define usuário atual para auditoria
    this.userContext.setCurrentUserId(String(usuario.matricula));
    // Opcional: guardar nome/perfil para UI
    try {
      localStorage.setItem('dro.currentUserName', usuario.nome || '');
      localStorage.setItem('dro.currentUserPerfil', usuario.perfil || '');
    } catch {}

    return usuario;
  }

  logout(): void {
    try {
      localStorage.removeItem('dro.currentUser');
      localStorage.removeItem('dro.currentUserName');
      localStorage.removeItem('dro.currentUserPerfil');
    } catch {}
  }

  isAuthenticated(): boolean {
    return !!this.userContext.getCurrentUserId();
  }
}
