import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('view_logs');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'audit'; // 'audit', 'webhooks', 'payments', 'whatsapp', 'all'
    const search = searchParams.get('search')?.toLowerCase().trim();

    let auditLogs: unknown[] = [];
    let webhookLogs: unknown[] = [];
    let paymentLogs: unknown[] = [];

    if (category === 'audit' || category === 'all') {
      const auditQuery = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await auditQuery;
      auditLogs = data || [];
    }

    if (category === 'webhooks' || category === 'all') {
      const { data } = await supabase
        .from('billing_webhook_events')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(100);
      webhookLogs = data || [];
    }

    if (category === 'payments' || category === 'all') {
      const { data } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      paymentLogs = data || [];
    }

    return NextResponse.json({
      success: true,
      logs: {
        audit: auditLogs,
        webhooks: webhookLogs,
        payments: paymentLogs,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch logs';
    console.error('[Admin Logs GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
