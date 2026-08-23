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
      .from('automations')
      .select('id, account_id, name, is_active, trigger_type, conditions, actions, total_runs, last_run_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId);
    }

    const [{ data: automations, error: autoErr }, { data: accounts }] = await Promise.all([
      query,
      supabase.from('accounts').select('id, name'),
    ]);

    if (autoErr) throw autoErr;

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const enriched = (automations || []).map((auto) => ({
      ...auto,
      clientName: accMap.get(auto.account_id) || 'Unknown Client',
      conditionsCount: Array.isArray(auto.conditions) ? auto.conditions.length : 0,
      actionsCount: Array.isArray(auto.actions) ? auto.actions.length : 0,
    }));

    return NextResponse.json({ success: true, automations: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to inspect automations';
    console.error('[Admin Automations GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
