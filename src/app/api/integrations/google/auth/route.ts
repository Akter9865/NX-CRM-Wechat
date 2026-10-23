import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { buildGoogleAuthUrl } from '@/lib/integrations/google/client';

/**
 * GET /api/integrations/google/auth?service=google_sheets | google_calendar
 *
 * Initiates secure, single-use, multi-tenant Google OAuth authorization.
 * Generates an HMAC-signed state parameter bound to the user's workspace account_id
 * and sets a short-lived secure cookie nonce to prevent CSRF attacks.
 */
export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const serviceParam = requestUrl.searchParams.get('service');

    if (serviceParam !== 'google_sheets' && serviceParam !== 'google_calendar') {
      return NextResponse.json(
        { error: 'Valid service parameter (google_sheets or google_calendar) is required.' },
        { status: 400 }
      );
    }

    const service = serviceParam;

    // Verify authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'Please log in to connect integrations.');
      return NextResponse.redirect(loginUrl.toString());
    }

    // Verify workspace membership and role (admin or owner required)
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id, account_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      return NextResponse.json(
        { error: 'No workspace account resolved for this user.' },
        { status: 400 }
      );
    }

    if (profile.account_role !== 'owner' && profile.account_role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workspace admins or owners can authorize integrations.' },
        { status: 403 }
      );
    }

    // Generate cryptographically random nonce
    const nonce = crypto.randomBytes(16).toString('hex');

    // Build signed Google OAuth URL
    const { url } = buildGoogleAuthUrl({
      accountId: profile.account_id,
      userId: user.id,
      service,
      origin: requestUrl.origin,
      nonce,
    });

    const format = requestUrl.searchParams.get('format');
    if (format === 'json') {
      const response = NextResponse.json({ success: true, url });
      response.cookies.set(`google_oauth_nonce_${service}`, nonce, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
      });
      return response;
    }

    const response = NextResponse.redirect(url);
    response.cookies.set(`google_oauth_nonce_${service}`, nonce, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
    });

    return response;
  } catch (err: any) {
    console.error('[GoogleAuth] Initiation error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initiate Google authorization.' },
      { status: 500 }
    );
  }
}
