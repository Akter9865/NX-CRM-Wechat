import { NextResponse } from 'next/server';
import { SUPERADMIN_COOKIE_NAME } from '@/lib/superadmin/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Super Admin logged out successfully',
  });

  response.cookies.set({
    name: SUPERADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
