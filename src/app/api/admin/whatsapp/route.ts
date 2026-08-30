import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    await requireAdminSession('manage_whatsapp');
    const supabase = getAdminSupabaseClient();

    const [
      { data: configs },
      { data: accounts },
      { data: templates },
    ] = await Promise.all([
      supabase
        .from('whatsapp_config')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('accounts').select('id, name'),
      supabase
        .from('message_templates')
        .select('id, account_id, name, category, language, status'),
    ]);

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const connList = configs || [];

    const enrichedConnections = connList.map((c) => {
      const clientName = accMap.get(c.account_id) || 'Unknown Client';
      const clientTemplates = (templates || []).filter((t) => t.account_id === c.account_id);

      return {
        id: c.id,
        accountId: c.account_id,
        clientName,
        connectionName: c.connection_name || c.business_name || `WhatsApp (${c.phone_number_id.slice(-4)})`,
        phoneNumberId: c.phone_number_id,
        wabaId: c.waba_id,
        appId: c.app_id,
        displayPhoneNumber: c.display_phone_number || 'N/A',
        verifiedName: c.business_name || 'Unverified',
        status: c.status || 'connected',
        qualityRating: c.quality_rating || 'GREEN',
        isDefault: Boolean(c.is_default),
        isArchived: Boolean(c.is_archived),
        lastWebhookAt: c.last_webhook_at,
        lastMessageReceivedAt: c.last_message_received_at,
        lastMessageSentAt: c.last_message_sent_at,
        templatesCount: clientTemplates.length,
        approvedTemplatesCount: clientTemplates.filter((t) => t.status === 'APPROVED' || t.status === 'Approved').length,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      connections: enrichedConnections,
      summary: {
        totalConnections: enrichedConnections.length,
        activeConnections: enrichedConnections.filter((c) => !c.isArchived && c.status === 'connected').length,
        degradedConnections: enrichedConnections.filter((c) => !c.isArchived && c.status === 'error').length,
        totalTemplates: templates?.length || 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch WhatsApp monitoring data';
    console.error('[Admin WhatsApp GET Error]:', err);
    return NextResponse.json({ error: msg, connections: [], summary: { totalConnections: 0, activeConnections: 0, degradedConnections: 0, totalTemplates: 0 } });
  }
}
