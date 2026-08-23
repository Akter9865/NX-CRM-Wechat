import { NextResponse } from 'next/server';
import { IMPERSONATION_COOKIE_NAME } from '@/lib/admin/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Exited impersonation mode',
    redirectUrl: '/admin/clients',
  });

  response.cookies.set({
    name: IMPERSONATION_COOKIE_NAME,
    value: '',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
