import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = getAdminSupabaseClient();

    const [
      { data: accounts, error: accErr },
      { data: apiKeys },
      { data: webhookEndpoints },
    ] = await Promise.all([
      supabase.from('accounts').select('id, name, settings'),
      supabase.from('api_keys').select('id, account_id, name, is_active'),
      supabase.from('webhook_endpoints').select('id, account_id, url, is_active'),
    ]);

    if (accErr) throw accErr;

    const integrationStats = {
      totalApiKeys: apiKeys?.length || 0,
      activeApiKeys: apiKeys?.filter((k) => k.is_active).length || 0,
      totalWebhookEndpoints: webhookEndpoints?.length || 0,
      activeWebhookEndpoints: webhookEndpoints?.filter((w) => w.is_active).length || 0,
      googleSheetsActiveClients: 0,
      zohoActiveClients: 0,
      smtpActiveClients: 0,
      telegramActiveClients: 0,
      calendlyActiveClients: 0,
    };

    const clientIntegrations = (accounts || []).map((acc) => {
      const settings = typeof acc.settings === 'object' && acc.settings ? (acc.settings as Record<string, unknown>) : {};
      const integrations = (settings.integrations as Record<string, { is_active?: boolean }>) || {};

      const hasSheets = Boolean(integrations.google_sheets?.is_active);
      const hasZoho = Boolean(integrations.zoho?.is_active);
      const hasSmtp = Boolean(integrations.smtp?.is_active);
      const hasTelegram = Boolean(integrations.telegram?.is_active);
      const hasCalendly = Boolean(integrations.calendly?.is_active);

      if (hasSheets) integrationStats.googleSheetsActiveClients++;
      if (hasZoho) integrationStats.zohoActiveClients++;
      if (hasSmtp) integrationStats.smtpActiveClients++;
      if (hasTelegram) integrationStats.telegramActiveClients++;
      if (hasCalendly) integrationStats.calendlyActiveClients++;

      const accApiKeys = (apiKeys || []).filter((k) => k.account_id === acc.id);
      const accWebhooks = (webhookEndpoints || []).filter((w) => w.account_id === acc.id);

      return {
        accountId: acc.id,
        clientName: acc.name || 'Unknown Client',
        googleSheets: hasSheets,
        zoho: hasZoho,
        smtp: hasSmtp,
        telegram: hasTelegram,
        calendly: hasCalendly,
        apiKeysCount: accApiKeys.length,
        webhooksCount: accWebhooks.length,
      };
    });

    return NextResponse.json({
      success: true,
      summary: integrationStats,
      clientIntegrations,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch integrations data';
    console.error('[Admin Integrations GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
