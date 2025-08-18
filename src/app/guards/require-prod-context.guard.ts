import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Exige a presença de idRelatorio e idAtividade (>0) nos query params
export const requireProdContextGuard: CanActivateFn = (route, state) => {
  const qp = route.queryParamMap;
  const ir = (qp.get('idRelatorio') || '').trim();
  const ia = (qp.get('idAtividade') || '').trim();
  // Para criar item de produtividade, basta o idAtividade (FK obrigatória)
  const hasContext = !!ia;

  if (hasContext) return true;

  const router = inject(Router);
  return router.createUrlTree(['/item-produtividade'], {
    queryParams: {
      alert: 'missingContext'
    }
  });
};
