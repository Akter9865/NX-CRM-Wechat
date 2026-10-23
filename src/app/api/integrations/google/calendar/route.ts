import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/integrations/google/client';
import {
  listUserCalendars,
  testCalendarIntegration,
} from '@/lib/integrations/google/calendar';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

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
 * GET /api/integrations/google/calendar
 * Lists writable calendars in the connected Google account.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await resolveAuth(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = auth;
    const { accessToken, googleEmail, config } = await getValidAccessToken(
      accountId,
      'google_calendar'
    );

    const calendars = await listUserCalendars(accessToken);

    return NextResponse.json({
      success: true,
      googleEmail,
      config,
      calendars,
    });
  } catch (err: any) {
    console.error('[GoogleCalendarAPI] GET error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to query Google Calendar API' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/google/calendar
 * Actions: 'save_config' | 'test_event'
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
        { error: 'Only workspace admins or owners can configure integrations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Action 1: Save calendar selection & settings
    if (action === 'save_config') {
      const { selected_calendar_id, selected_calendar_summary, booking_duration_mins, is_enabled } = body;

      const { data: current } = await supabaseAdmin()
        .from('account_integrations')
        .select('config')
        .eq('account_id', accountId)
        .eq('integration_id', 'google_calendar')
        .maybeSingle();

      const existingConfig = current?.config || {};

      const updatedConfig = {
        ...existingConfig,
        selected_calendar_id: selected_calendar_id || existingConfig.selected_calendar_id || 'primary',
        selected_calendar_summary:
          selected_calendar_summary || existingConfig.selected_calendar_summary || 'Primary Calendar',
        booking_duration_mins: booking_duration_mins || existingConfig.booking_duration_mins || '30',
      };

      const { error: updateErr } = await supabaseAdmin()
        .from('account_integrations')
        .update({
          is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
          config: updatedConfig,
          external_resource_id: updatedConfig.selected_calendar_id,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('integration_id', 'google_calendar');

      if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('column'))) {
        await supabaseAdmin()
          .from('account_integrations')
          .update({
            is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
            config: updatedConfig,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', accountId)
          .eq('integration_id', 'google_calendar');
      }

      return NextResponse.json({
        success: true,
        message: 'Google Calendar configuration saved successfully!',
        config: updatedConfig,
      });
    }

    // Action 2: Create a verified test event with Google Meet link
    if (action === 'test_event') {
      const result = await testCalendarIntegration(accountId);
      return NextResponse.json({
        success: true,
        message: 'Verified appointment created on your Google Calendar!',
        event: result.event,
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('[GoogleCalendarAPI] POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process Google Calendar request' },
      { status: 500 }
    );
  }
}
