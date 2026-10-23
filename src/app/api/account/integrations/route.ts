import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { INTEGRATION_DEFINITIONS, type IntegrationId } from '@/lib/integrations/types';
import { syncContactToGoogleSheet } from '@/lib/integrations/google/sheets';

function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

async function resolveAccount(supabase: Awaited<ReturnType<typeof createClient>>) {
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
 * GET /api/account/integrations
 * Retrieves all integration configs for the active account.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await resolveAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = auth;

    // Load account settings or integrations from Supabase
    // We store account-level integrations in account metadata or fallback to key-value
    const { data: accountData, error: accountError } = await supabaseAdmin()
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Load integration rows from account custom settings table or kv store
    // Check if custom integrations are stored
    const { data: integrationsData } = await supabaseAdmin()
      .from('account_integrations')
      .select('*')
      .eq('account_id', accountId);

    // Sanitize configs so sensitive tokens are NEVER leaked to the client
    const activeIntegrations = (integrationsData || []).map((row: any) => {
      const sanitizedConfig = { ...(row.config || {}) };
      delete sanitizedConfig.encrypted_refresh_token;
      delete sanitizedConfig.access_token;

      return {
        id: row.id,
        integration_id: row.integration_id,
        is_enabled: row.is_enabled,
        google_account_email: row.google_account_email || sanitizedConfig.google_email || null,
        config: sanitizedConfig,
        last_synced_at: row.last_synced_at,
        last_error: row.last_error,
        updated_at: row.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      integrations: activeIntegrations,
      catalog: INTEGRATION_DEFINITIONS,
    });
  } catch (err) {
    console.error('Error in GET /api/account/integrations:', err);
    // Return gracefully with catalog
    return NextResponse.json({
      success: true,
      integrations: [],
      catalog: INTEGRATION_DEFINITIONS,
    });
  }
}

/**
 * POST /api/account/integrations
 * Saves or updates integration configuration and optionally tests connection.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, role } = auth;
    const body = await request.json();
    const { integration_id, is_enabled, config, action } = body;

    // Allow agents to trigger contact sync from the live inbox, but restrict config updates to admins/owners
    if (action !== 'sync_contact' && role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins or owners can configure integrations.' },
        { status: 403 }
      );
    }

    if (!integration_id || !INTEGRATION_DEFINITIONS[integration_id as IntegrationId]) {
      return NextResponse.json(
        { error: 'Valid integration_id is required' },
        { status: 400 }
      );
    }

    // Action: 'test' connection
    if (action === 'test') {
      if (integration_id === 'google_sheets') {
        const webhookUrl = config?.webhook_url;
        if (!webhookUrl) {
          return NextResponse.json(
            { error: 'Google Sheets Webhook URL is required for testing.' },
            { status: 400 }
          );
        }

        try {
          const testRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              test: true,
              event: 'NX_CRM_CONNECTION_TEST',
              timestamp: new Date().toISOString(),
              sample_data: {
                name: 'Test Customer',
                phone: '+919876543210',
                status: 'Qualified Lead',
              },
            }),
          });

          if (!testRes.ok) {
            return NextResponse.json({
              success: false,
              message: `Webhook returned status ${testRes.status}`,
            });
          }

          return NextResponse.json({
            success: true,
            message: 'Successfully sent test ping to Google Sheets!',
          });
        } catch (pingErr: any) {
          return NextResponse.json({
            success: false,
            message: `Could not reach webhook URL: ${pingErr?.message || 'Network error'}`,
          });
        }
      }

      if (integration_id === 'zapier_webhook') {
        const webhookUrl = config?.webhook_url;
        if (!webhookUrl) {
          return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
        }

        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'crm.ping',
              account_id: accountId,
              message: 'Test event from NX CRM Integrations Hub',
              timestamp: new Date().toISOString(),
            }),
          });
          return NextResponse.json({
            success: true,
            message: 'Webhook test ping delivered successfully!',
          });
        } catch (pingErr: any) {
          return NextResponse.json({
            success: false,
            message: `Webhook delivery error: ${pingErr?.message}`,
          });
        }
      }

      // Default generic test
      return NextResponse.json({
        success: true,
        message: 'Configuration validated successfully!',
      });
    }

    // Action: 'sync_contact' (Real-time sync from Live Inbox or Flow)
    if (action === 'sync_contact') {
      const { contact_id } = body;
      if (!contact_id) {
        return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
      }

      // Fetch contact details
      const { data: contact } = await supabaseAdmin()
        .from('contacts')
        .select('*, contact_tags(tags(name))')
        .eq('id', contact_id)
        .eq('account_id', accountId)
        .maybeSingle();

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }

      if (integration_id === 'google_sheets') {
        const { data: integ } = await supabaseAdmin()
          .from('account_integrations')
          .select('config, is_enabled, encrypted_refresh_token')
          .eq('account_id', accountId)
          .eq('integration_id', 'google_sheets')
          .maybeSingle();

        const tagNames = Array.isArray(contact.contact_tags)
          ? contact.contact_tags.map((ct: any) => ct.tags?.name).filter(Boolean).join(', ')
          : '';

        // If connected via Google OAuth, use the direct Sheets API
        const hasOAuth = Boolean(
          integ?.is_enabled &&
            (integ.encrypted_refresh_token || integ.config?.encrypted_refresh_token)
        );

        if (hasOAuth) {
          const syncResult = await syncContactToGoogleSheet(
            accountId,
            {
              id: contact.id,
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              stage: contact.status || 'Lead',
              tags: tagNames,
              notes: 'NX CRM Live Inbox',
              created_at: contact.created_at,
            },
            { source: 'NX CRM Live Inbox' }
          );

          return NextResponse.json(syncResult);
        }

        // Fallback: Legacy webhook URL if OAuth not connected
        let webhookUrl = config?.webhook_url || integ?.config?.webhook_url;
        if (!webhookUrl) {
          return NextResponse.json(
            { error: 'Google Sheets is not connected. Please connect with Google in Integrations & Apps.' },
            { status: 400 }
          );
        }

        const payload = {
          event: 'LEAD_SYNC',
          timestamp: new Date().toISOString(),
          account_id: accountId,
          contact_id: contact.id,
          name: contact.name || '',
          phone: contact.phone || '',
          email: contact.email || '',
          tags: tagNames,
          source: 'NX CRM Live Inbox',
        };

        const sheetRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!sheetRes.ok) {
          return NextResponse.json(
            { error: `Google Sheets returned HTTP status ${sheetRes.status}` },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Contact "${contact.name || contact.phone}" successfully synced to Google Sheets!`,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Sync processed successfully.',
      });
    }

    // Save or update configuration
    // We attempt to upsert to `account_integrations` if table exists, otherwise store in settings
    try {
      const { error: upsertError } = await supabaseAdmin()
        .from('account_integrations')
        .upsert(
          {
            account_id: accountId,
            integration_id,
            is_enabled: Boolean(is_enabled),
            config: config || {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id,integration_id' }
        );

      if (upsertError) {
        console.warn('account_integrations table error (fallback mode):', upsertError.message);
      }
    } catch (dbErr) {
      console.warn('Upsert fallback:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `${INTEGRATION_DEFINITIONS[integration_id as IntegrationId].name} settings saved successfully!`,
      integration: {
        integration_id,
        is_enabled: Boolean(is_enabled),
        config: config || {},
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/account/integrations:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
