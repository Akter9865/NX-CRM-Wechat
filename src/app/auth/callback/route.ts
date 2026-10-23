import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * 
 * Handles Supabase email confirmation, password reset tokens, and Google / OAuth redirects.
 * Exchanges authorization code for an authenticated session cookie and redirects to target route.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Resolve target base URL reliably across localhost, custom domains, and reverse proxies
  const isLocalHost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  let siteUrl = requestUrl.origin;

  if (!isLocalHost) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
      siteUrl = `${forwardedProto}://${forwardedHost}`;
    } else {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestUrl.origin;
    }
  }

  // Handle explicit errors returned from Supabase Auth (e.g., cancelled popup, expired token)
  if (error) {
    console.error('[auth/callback] Supabase auth returned error:', error, errorDescription);
    const targetPath = next.includes('reset-password') ? '/forgot-password' : '/login';
    const redirectError = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${siteUrl}${targetPath}?error=${redirectError}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Ensure target redirect is a relative path to prevent open redirect vulnerabilities
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      return NextResponse.redirect(`${siteUrl}${safeNext}`);
    }

    console.error('[auth/callback] Error exchanging code for session:', exchangeError);
    const targetPath = next.includes('reset-password') ? '/forgot-password' : '/login';
    return NextResponse.redirect(`${siteUrl}${targetPath}?error=${encodeURIComponent(exchangeError.message)}`);
  }

  // Fallback to login with error indicator
  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`);
}
