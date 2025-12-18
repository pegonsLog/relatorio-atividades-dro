import { Component, inject } from '@angular/core';
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

  form = this.fb.group({
    matricula: [null as number | null, [Validators.required, Validators.min(1)]],
    senha: ['', [Validators.required]]
  });

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
