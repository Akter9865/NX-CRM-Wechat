import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('manage_whatsapp');
    const supabase = getAdminSupabaseClient();

    const [
      { data: connections, error: connErr },
      { data: accounts },
      { data: configs },
      { data: templates },
    ] = await Promise.all([
      supabase.from('whatsapp_connections').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('id, name'),
      supabase.from('whatsapp_configs').select('account_id, waba_id, phone_number_id, display_phone_number, verified_name, status, updated_at'),
      supabase.from('message_templates').select('id, account_id, name, category, language, status'),
    ]);

    if (connErr) throw connErr;

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const enrichedConnections = (connections || []).map((c) => {
      const clientName = accMap.get(c.account_id) || 'Unknown Client';
      const clientTemplates = (templates || []).filter((t) => t.account_id === c.account_id);

      return {
        id: c.id,
        accountId: c.account_id,
        clientName,
        phoneNumberId: c.phone_number_id,
        wabaId: c.waba_id,
        displayPhoneNumber: c.display_phone_number || 'N/A',
        verifiedName: c.verified_name || 'Unverified',
        status: c.status || 'connected',
        qualityRating: 'GREEN',
        isDefault: c.is_default,
        templatesCount: clientTemplates.length,
        approvedTemplatesCount: clientTemplates.filter((t) => t.status === 'APPROVED').length,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      connections: enrichedConnections,
      summary: {
        totalConnections: enrichedConnections.length,
        activeConnections: enrichedConnections.filter((c) => c.status === 'connected' || c.status === 'active').length,
        degradedConnections: enrichedConnections.filter((c) => c.status === 'degraded' || c.status === 'registration_failed').length,
        totalTemplates: templates?.length || 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch WhatsApp monitoring data';
    console.error('[Admin WhatsApp GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
