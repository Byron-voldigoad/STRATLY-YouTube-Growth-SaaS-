import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('Supabase auth error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=Supabase+auth+error&error_description=${encodeURIComponent(error.message)}`);
    } catch (e: any) {
      console.error('Caught exception in callback:', e.message);
      return NextResponse.redirect(`${origin}/login?error=Caught+exception&error_description=${encodeURIComponent(e.message)}`);
    }
  }

  // return the user to an error page with instructions
  console.error('Callback called without a code parameter.');
  return NextResponse.redirect(`${origin}/login?error=No+code+provided`);
}
