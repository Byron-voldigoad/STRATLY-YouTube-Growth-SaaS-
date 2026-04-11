import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session = new BehaviorSubject<Session | null>(null);
  private _user = new BehaviorSubject<User | null>(null);

  public session$ = this._session.asObservable();
  public user$ = this._user.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );

    // Écouter les changements d'auth
    this.supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
    });

    // Initialiser la session au démarrage
    this.supabase.auth.getSession().then((res: any) => {
      this._session.next(res.data?.session ?? null);
      this._user.next(res.data?.session?.user ?? null);
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // ─── Auth Methods ───────────────────────────────────────

  async getUser(): Promise<User | null> {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${environment.appUrl}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }

  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${environment.appUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${environment.appUrl}/auth/callback`,
    });
    if (error) throw error;
  }

  // ─── Database Methods ───────────────────────────────────

  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  }
}
