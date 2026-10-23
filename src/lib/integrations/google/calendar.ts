import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getValidAccessToken } from './client';

export interface CalendarSummary {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  timeZone?: string;
  attendeeEmail?: string;
  createMeetLink?: boolean;
}

export interface CreatedEventResult {
  eventId: string;
  htmlLink: string;
  meetUrl?: string;
  summary: string;
  start: string;
  end: string;
}

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

/**
 * Lists calendars available to the authorized Google account.
 */
export async function listUserCalendars(
  accessToken: string
): Promise<CalendarSummary[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch calendars (Status: ${res.status})`);
  }

  const data = await res.json();
  return (data.items || []).map((cal: any) => ({
    id: cal.id,
    summary: cal.summary || 'Calendar',
    description: cal.description,
    primary: Boolean(cal.primary),
    timeZone: cal.timeZone,
    backgroundColor: cal.backgroundColor,
  }));
}

/**
 * Creates an appointment / meeting in the target Google Calendar.
 */
export async function createCalendarAppointment(
  accessToken: string,
  calendarId: string,
  params: CreateEventParams
): Promise<CreatedEventResult> {
  const targetCalId = encodeURIComponent(calendarId || 'primary');
  const query = params.createMeetLink !== false ? '?conferenceDataVersion=1' : '';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${targetCalId}/events${query}`;

  const body: Record<string, any> = {
    summary: params.summary,
    description: params.description || 'Consultation appointment scheduled via NX CRM.',
    start: {
      dateTime: params.startTime,
      timeZone: params.timeZone || 'UTC',
    },
    end: {
      dateTime: params.endTime,
      timeZone: params.timeZone || 'UTC',
    },
  };

  if (params.attendeeEmail) {
    body.attendees = [{ email: params.attendeeEmail }];
  }

  if (params.createMeetLink !== false) {
    body.conferenceData = {
      createRequest: {
        requestId: `nxcrm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || `Google Calendar API error (${res.status})`;
    throw new Error(msg);
  }

  const meetUrl =
    data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
    data.hangoutLink;

  return {
    eventId: data.id,
    htmlLink: data.htmlLink || `https://calendar.google.com/calendar/u/0/r/eventedit/${data.id}`,
    meetUrl,
    summary: data.summary,
    start: data.start?.dateTime || params.startTime,
    end: data.end?.dateTime || params.endTime,
  };
}

/**
 * Performs a verified test event creation on Google Calendar.
 */
export async function testCalendarIntegration(
  accountId: string
): Promise<{ success: boolean; event: CreatedEventResult }> {
  const { accessToken, config } = await getValidAccessToken(accountId, 'google_calendar');

  const calendarId = config.selected_calendar_id || 'primary';
  const durationMins = parseInt(config.booking_duration_mins, 10) || 30;

  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const event = await createCalendarAppointment(accessToken, calendarId, {
    summary: 'NX CRM Test Consultation Call',
    description: 'This is a verified test event generated from NX CRM Integrations & Apps Hub.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    createMeetLink: true,
  });

  // Update last_synced_at
  await supabaseAdmin()
    .from('account_integrations')
    .update({
      last_synced_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('account_id', accountId)
    .eq('integration_id', 'google_calendar');

  return { success: true, event };
}
