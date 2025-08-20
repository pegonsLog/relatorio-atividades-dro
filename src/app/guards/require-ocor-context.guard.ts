import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Exige a presença de idAtividade (>0) nos query params para criar item de ocorrência
export const requireOcorContextGuard: CanActivateFn = (route, state) => {
  const qp = route.queryParamMap;
  const ia = (qp.get('idAtividade') || '').trim();
  const hasContext = !!ia;

  if (hasContext) return true;

  const router = inject(Router);
  return router.createUrlTree(['/item-ocorrencia'], {
    queryParams: {
      alert: 'missingContext'
    }
  });
};
