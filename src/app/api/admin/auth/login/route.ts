import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminSession = await validateAdminCredentials(email, password);

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const token = await createAdminToken(adminSession);

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Log admin login event
    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'admin.login',
      targetType: 'system',
      details: { ip },
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        email: adminSession.email,
        fullName: adminSession.fullName,
        role: adminSession.role,
        permissions: adminSession.permissions,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: unknown) {
    console.error('[Admin Login Error]:', err);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
