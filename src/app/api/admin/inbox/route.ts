import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('inspect_inbox');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');

    let query = supabase
      .from('conversations')
      .select('id, account_id, contact_id, status, last_message_at, unread_count, assigned_to, created_at, tags')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50);

    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const [
      { data: conversations, error: convErr },
      { data: contacts },
      { data: accounts },
      { data: profiles },
    ] = await Promise.all([
      query,
      supabase.from('contacts').select('id, name, phone, email'),
      supabase.from('accounts').select('id, name'),
      supabase.from('profiles').select('user_id, full_name'),
    ]);

    if (convErr) throw convErr;

    const contactMap = new Map<string, NonNullable<typeof contacts>[number]>();
    contacts?.forEach((c) => contactMap.set(c.id, c));

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const agentMap = new Map<string, string>();
    profiles?.forEach((p) => agentMap.set(p.user_id, p.full_name));

    const enriched = (conversations || []).map((conv) => {
      const contact = contactMap.get(conv.contact_id);
      const clientName = accMap.get(conv.account_id) || 'Unknown Client';
      const agentName = conv.assigned_to ? agentMap.get(conv.assigned_to) || 'Agent' : 'Unassigned';

      return {
        id: conv.id,
        accountId: conv.account_id,
        clientName,
        contactName: contact?.name || contact?.phone || 'Customer',
        contactPhone: contact?.phone || 'N/A',
        channel: 'WhatsApp',
        assignedAgent: agentName,
        status: conv.status,
        tags: Array.isArray(conv.tags) ? conv.tags : [],
        unreadCount: conv.unread_count || 0,
        lastMessageAt: conv.last_message_at || conv.created_at,
        createdAt: conv.created_at,
      };
    });

    return NextResponse.json({ success: true, conversations: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to inspect inbox';
    console.error('[Admin Inbox GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
