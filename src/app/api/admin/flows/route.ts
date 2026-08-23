import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('inspect_automations');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    let query = supabase
      .from('flows')
      .select('id, account_id, name, is_active, trigger_type, nodes, total_runs, last_run_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId);
    }

    const [{ data: flows, error: flowErr }, { data: accounts }] = await Promise.all([
      query,
      supabase.from('accounts').select('id, name'),
    ]);

    if (flowErr) throw flowErr;

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const enriched = (flows || []).map((f) => ({
      ...f,
      clientName: accMap.get(f.account_id) || 'Unknown Client',
      nodesCount: Array.isArray(f.nodes) ? f.nodes.length : typeof f.nodes === 'object' && f.nodes ? Object.keys(f.nodes).length : 0,
    }));

    return NextResponse.json({ success: true, flows: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to inspect flows';
    console.error('[Admin Flows GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
