import { NextResponse } from 'next/server';
import {
  createSuperAdminToken,
  validateSuperAdminCredentials,
  SUPERADMIN_COOKIE_NAME,
} from '@/lib/superadmin/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const isValid = validateSuperAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Super Admin credentials' },
        { status: 401 }
      );
    }

    const token = await createSuperAdminToken(email.trim().toLowerCase());

    const response = NextResponse.json({
      success: true,
      message: 'Super Admin authenticated successfully',
      user: {
        email: email.trim().toLowerCase(),
        role: 'superadmin',
      },
    });

    response.cookies.set({
      name: SUPERADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[superadmin-login] error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
