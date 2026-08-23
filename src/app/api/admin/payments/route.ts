import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession('view_payments');
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const [
      { data: payments, error: pErr },
      { data: accounts },
      { data: profiles },
    ] = await Promise.all([
      supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('accounts').select('id, name'),
      supabase.from('profiles').select('account_id, full_name, email, account_role'),
    ]);

    if (pErr) throw pErr;

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const ownerMap = new Map<string, { name: string; email: string }>();
    profiles?.forEach((prof) => {
      if (prof.account_id && (!ownerMap.has(prof.account_id) || prof.account_role === 'owner')) {
        ownerMap.set(prof.account_id, { name: prof.full_name, email: prof.email });
      }
    });

    let list = (payments || []).map((p) => {
      const clientName = accMap.get(p.account_id) || 'Unknown Client';
      const owner = ownerMap.get(p.account_id) || { name: 'N/A', email: 'N/A' };

      // Convert paise to rupees if amount > 10000
      const displayAmount = p.amount > 100000 ? Math.round(p.amount / 100) : p.amount;

      return {
        id: p.id,
        accountId: p.account_id,
        clientName,
        ownerEmail: owner.email,
        ownerName: owner.name,
        razorpayPaymentId: p.razorpay_payment_id || 'N/A',
        razorpayOrderId: p.razorpay_order_id || 'N/A',
        razorpaySubscriptionId: p.razorpay_subscription_id || 'N/A',
        amount: displayAmount,
        currency: p.currency || 'INR',
        status: p.status,
        paymentMethod: p.payment_method || 'UPI / Card',
        createdAt: p.created_at,
      };
    });

    if (status && status !== 'all') {
      list = list.filter((p) => p.status === status);
    }
    if (search) {
      list = list.filter(
        (p) =>
          p.clientName.toLowerCase().includes(search) ||
          p.ownerEmail.toLowerCase().includes(search) ||
          p.razorpayPaymentId.toLowerCase().includes(search) ||
          p.razorpayOrderId.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, payments: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payments';
    console.error('[Admin Payments GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
