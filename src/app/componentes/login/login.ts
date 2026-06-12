import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = false;
  errorMsg = '';

  // Instalação do PWA (Android/Chrome). No iOS o evento não dispara,
  // então o botão simplesmente não aparece.
  private deferredPrompt: any = null;
  podeInstalar = false;
  instalando = false;

  form = this.fb.group({
    matricula: [null as number | null, [Validators.required, Validators.min(1)]],
    senha: ['', [Validators.required]]
  });

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event) {
    // Impede o mini-infobar padrão e guarda o evento para acionar depois.
    e.preventDefault();
    this.deferredPrompt = e;
    this.podeInstalar = true;
  }

  @HostListener('window:appinstalled')
  onAppInstalled() {
    this.podeInstalar = false;
    this.deferredPrompt = null;
  }

  async instalarApp() {
    if (!this.deferredPrompt || this.instalando) return;
    this.instalando = true;
    try {
      this.deferredPrompt.prompt();
      await this.deferredPrompt.userChoice;
    } catch {
      // Usuário cancelou ou o navegador rejeitou; ignora.
    } finally {
      this.deferredPrompt = null;
      this.podeInstalar = false;
      this.instalando = false;
    }
  }

  async onSubmit() {
    this.errorMsg = '';
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    const { matricula, senha } = this.form.getRawValue();
    try {
      await this.auth.login(Number(matricula), String(senha));
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/menu';
      this.router.navigateByUrl(returnUrl);
    } catch (e: any) {
      this.errorMsg = e?.message || 'Falha no login';
    } finally {
      this.loading = false;
    }
  }
}
