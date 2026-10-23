import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeGoogleToken } from '@/lib/integrations/google/client';

async function resolveAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) return null;

  return {
    user,
    accountId: profile.account_id as string,
    role: (profile.account_role as string) || 'agent',
  };
}

/**
 * POST /api/integrations/google/disconnect
 * Body: { service: 'google_sheets' | 'google_calendar' }
 * Revokes Google OAuth token and clears credentials from the workspace.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveAuth(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, role } = auth;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only workspace admins or owners can disconnect integrations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { service } = body;

    if (service !== 'google_sheets' && service !== 'google_calendar') {
      return NextResponse.json(
        { error: 'Valid service parameter (google_sheets or google_calendar) is required.' },
        { status: 400 }
      );
    }

    await revokeGoogleToken(accountId, service);

    return NextResponse.json({
      success: true,
      message: `${
        service === 'google_sheets' ? 'Google Sheets' : 'Google Calendar'
      } disconnected and tokens revoked successfully.`,
    });
  } catch (err: any) {
    console.error('[GoogleDisconnect] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to disconnect integration.' },
      { status: 500 }
    );
  }
}
