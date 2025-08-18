import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Exige a presença de idRelatorio e idAtividade (>0) nos query params
export const requireProdContextGuard: CanActivateFn = (route, state) => {
  const qp = route.queryParamMap;
  const ir = Number(qp.get('idRelatorio'));
  const ia = Number(qp.get('idAtividade'));
  const hasContext = Number.isFinite(ir) && ir > 0 && Number.isFinite(ia) && ia > 0;

  if (hasContext) return true;

  const router = inject(Router);
  return router.createUrlTree(['/item-produtividade'], {
    queryParams: {
      alert: 'missingContext'
    }
  });
};
