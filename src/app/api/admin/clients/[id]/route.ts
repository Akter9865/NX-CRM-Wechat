import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await requireAdminSession('manage_clients');
    const { id } = await params;
    const supabase = getAdminSupabaseClient();

    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (accErr || !account) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [
      { data: profiles },
      { data: subscription },
      { data: waConnections },
      { data: payments },
      { data: automations },
      { data: flows },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('account_id', id),
      supabase.from('subscriptions').select('*').eq('account_id', id).single(),
      supabase.from('whatsapp_connections').select('*').eq('account_id', id),
      supabase.from('payment_transactions').select('*').eq('account_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('automations').select('id, name, is_active, trigger_type').eq('account_id', id),
      supabase.from('flows').select('id, name, is_active, trigger_type').eq('account_id', id),
    ]);

    return NextResponse.json({
      success: true,
      client: {
        ...account,
        profiles: profiles || [],
        subscription: subscription || null,
        whatsappConnections: waConnections || [],
        payments: payments || [],
        automations: automations || [],
        flows: flows || [],
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load client details';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const adminSession = await requireAdminSession('manage_clients');
    const { id } = await params;
    const supabase = getAdminSupabaseClient();
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    if (action === 'suspend') {
      await Promise.all([
        supabase.from('accounts').update({ status: 'suspended', updated_at: new Date().toISOString() }).eq('id', id),
        supabase.from('subscriptions').update({ status: 'suspended', updated_at: new Date().toISOString() }).eq('account_id', id),
      ]);

      await logAdminAction({
        adminEmail: adminSession.email,
        adminRole: adminSession.role,
        action: 'client.suspend',
        targetType: 'account',
        targetId: id,
        details: { reason: body.reason || 'Admin suspended account' },
      });

      return NextResponse.json({ success: true, message: 'Client account suspended' });
    }

    if (action === 'reactivate') {
      await Promise.all([
        supabase.from('accounts').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', id),
        supabase.from('subscriptions').update({ status: 'active', updated_at: new Date().toISOString() }).eq('account_id', id),
      ]);

      await logAdminAction({
        adminEmail: adminSession.email,
        adminRole: adminSession.role,
        action: 'client.reactivate',
        targetType: 'account',
        targetId: id,
      });

      return NextResponse.json({ success: true, message: 'Client account reactivated' });
    }

    if (action === 'extend_subscription') {
      const days = Number(body.days) || 30;
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('current_period_end')
        .eq('account_id', id)
        .single();

      const currentEnd = currentSub?.current_period_end
        ? new Date(currentSub.current_period_end)
        : new Date();
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('subscriptions')
        .update({
          current_period_end: newEnd,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', id);

      await logAdminAction({
        adminEmail: adminSession.email,
        adminRole: adminSession.role,
        action: 'client.subscription_extend',
        targetType: 'subscription',
        targetId: id,
        details: { daysExtended: days, newExpiryDate: newEnd },
      });

      return NextResponse.json({
        success: true,
        message: `Subscription extended by ${days} days until ${new Date(newEnd).toLocaleDateString()}`,
      });
    }

    if (action === 'reset_usage') {
      const currentPeriod = new Date().toISOString().substring(0, 7);
      await supabase
        .from('usage_records')
        .update({
          messages_sent: 0,
          messages_received: 0,
          automation_runs: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', id)
        .eq('billing_period', currentPeriod);

      await logAdminAction({
        adminEmail: adminSession.email,
        adminRole: adminSession.role,
        action: 'client.usage_reset',
        targetType: 'usage_record',
        targetId: id,
        details: { period: currentPeriod },
      });

      return NextResponse.json({ success: true, message: 'Client message & automation usage reset for current month' });
    }

    if (action === 'update_details') {
      const { name, notes } = body;
      await supabase
        .from('accounts')
        .update({
          name: name || undefined,
          notes: notes !== undefined ? notes : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      await logAdminAction({
        adminEmail: adminSession.email,
        adminRole: adminSession.role,
        action: 'client.update_details',
        targetType: 'account',
        targetId: id,
        details: { name, notes },
      });

      return NextResponse.json({ success: true, message: 'Client details updated' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Action execution failed';
    console.error('[Admin Client Action Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const adminSession = await requireAdminSession('delete_clients');
    const { id } = await params;
    const supabase = getAdminSupabaseClient();

    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'client.delete',
      targetType: 'account',
      targetId: id,
    });

    return NextResponse.json({ success: true, message: 'Client account permanently deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete client';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
