import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, IMPERSONATION_COOKIE_NAME } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('impersonate_clients');
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const supabase = getAdminSupabaseClient();
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Target client account not found' }, { status: 404 });
    }

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'client.impersonate',
      targetType: 'account',
      targetId: accountId,
      details: { accountName: account.name },
    });

    const cookiePayload = JSON.stringify({
      accountId: account.id,
      accountName: account.name,
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      timestamp: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      message: `Impersonating client: ${account.name}`,
      redirectUrl: '/dashboard',
    });

    response.cookies.set({
      name: IMPERSONATION_COOKIE_NAME,
      value: Buffer.from(cookiePayload).toString('base64'),
      httpOnly: false, // accessible to client component banner
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60, // 4 hours
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Impersonation failed';
    console.error('[Admin Impersonate Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
