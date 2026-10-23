import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/integrations/google/client';
import {
  createDefaultLeadsSpreadsheet,
  getSpreadsheetDetails,
  listAccessibleSpreadsheets,
  syncContactToGoogleSheet,
} from '@/lib/integrations/google/sheets';

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
 * GET /api/integrations/google/sheets
 * Lists spreadsheets or queries specific spreadsheet details (tabs/columns).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveAuth(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = auth;
    const requestUrl = new URL(request.url);
    const spreadsheetId = requestUrl.searchParams.get('spreadsheet_id');

    const { accessToken, googleEmail, config } = await getValidAccessToken(
      accountId,
      'google_sheets'
    );

    if (spreadsheetId) {
      const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
      return NextResponse.json({
        success: true,
        details,
      });
    }

    const spreadsheets = await listAccessibleSpreadsheets(accessToken);

    return NextResponse.json({
      success: true,
      googleEmail,
      config,
      spreadsheets,
    });
  } catch (err: any) {
    console.error('[GoogleSheetsAPI] GET error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to query Google Sheets API' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/google/sheets
 * Actions: 'save_config' | 'create_default' | 'test_sync'
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

    // Action 1: Create brand new default spreadsheet
    if (action === 'create_default') {
      const { accessToken, config } = await getValidAccessToken(accountId, 'google_sheets');
      const title = body.title || 'NX CRM - WhatsApp Leads';
      const created = await createDefaultLeadsSpreadsheet(accessToken, title);

      const updatedConfig = {
        ...config,
        selected_spreadsheet_id: created.spreadsheetId,
        selected_spreadsheet_title: created.title,
        selected_sheet_name: created.sheetName,
        selected_spreadsheet_url: created.spreadsheetUrl,
      };

      await supabaseAdmin()
        .from('account_integrations')
        .update({
          config: updatedConfig,
          external_resource_id: created.spreadsheetId,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('integration_id', 'google_sheets');

      return NextResponse.json({
        success: true,
        message: `Created spreadsheet "${created.title}" successfully!`,
        spreadsheet: created,
      });
    }

    // Action 2: Save spreadsheet selection & mapping
    if (action === 'save_config') {
      const {
        selected_spreadsheet_id,
        selected_spreadsheet_title,
        selected_sheet_name,
        column_mapping,
        auto_sync_leads,
        is_enabled,
      } = body;

      const { data: current } = await supabaseAdmin()
        .from('account_integrations')
        .select('config')
        .eq('account_id', accountId)
        .eq('integration_id', 'google_sheets')
        .maybeSingle();

      const existingConfig = current?.config || {};

      const updatedConfig = {
        ...existingConfig,
        selected_spreadsheet_id: selected_spreadsheet_id || existingConfig.selected_spreadsheet_id,
        selected_spreadsheet_title:
          selected_spreadsheet_title || existingConfig.selected_spreadsheet_title,
        selected_sheet_name: selected_sheet_name || existingConfig.selected_sheet_name || 'Sheet1',
        column_mapping: column_mapping || existingConfig.column_mapping || {},
        auto_sync_leads: auto_sync_leads || existingConfig.auto_sync_leads || 'all',
      };

      const { error: updateErr } = await supabaseAdmin()
        .from('account_integrations')
        .update({
          is_enabled: is_enabled !== undefined ? Boolean(is_enabled) : true,
          config: updatedConfig,
          external_resource_id: updatedConfig.selected_spreadsheet_id,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('integration_id', 'google_sheets');

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
          .eq('integration_id', 'google_sheets');
      }

      return NextResponse.json({
        success: true,
        message: 'Google Sheets configuration saved successfully!',
        config: updatedConfig,
      });
    }

    // Action 3: Test Sync (appends a verified test lead to the sheet)
    if (action === 'test_sync') {
      const sampleContact = {
        id: 'test-lead-' + Date.now(),
        name: body.test_name || 'Test WhatsApp Lead',
        phone: body.test_phone || '+91 98765 43210',
        email: body.test_email || 'test.lead@example.com',
        stage: 'Qualified Lead',
        tags: ['WhatsApp', 'VIP Lead', 'Test Event'],
        notes: 'Verified Test from NX CRM Integrations Hub',
        created_at: new Date().toISOString(),
      };

      const syncResult = await syncContactToGoogleSheet(accountId, sampleContact, {
        source: 'NX CRM Test Connection',
      });

      return NextResponse.json(syncResult);
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('[GoogleSheetsAPI] POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process Google Sheets request' },
      { status: 500 }
    );
  }
}
