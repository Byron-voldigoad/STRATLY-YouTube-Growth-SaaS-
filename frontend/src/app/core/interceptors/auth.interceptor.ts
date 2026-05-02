import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { from, switchMap, catchError, throwError, of } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(SupabaseService);

  return from(supabase.getSession()).pipe(
    switchMap(session => {
      if (session?.access_token) {
        const clonedRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        return next(clonedRequest);
      }
      return next(req);
    }),
    catchError(error => {
      console.error('Interceptor error getting session:', error);
      return next(req);
    })
  );
};
