import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * 
 * Handles Supabase email confirmation, password reset tokens, and OAuth redirects.
 * Exchanges authorization code for an authenticated session cookie and redirects to target route.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure target redirect is a relative path to prevent open redirect vulnerabilities
      const safeNext = next.startsWith('/') ? next : '/dashboard';
      return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
    }

    console.error('[auth/callback] Error exchanging code for session:', error);
  }

  // Fallback to login with error indicator
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_failed`);
}
