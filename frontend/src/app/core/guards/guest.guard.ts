import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const guestGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const user = await supabase.getUser();
  if (user) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
