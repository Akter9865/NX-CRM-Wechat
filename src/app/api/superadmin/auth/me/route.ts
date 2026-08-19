import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/superadmin/auth';

export async function GET() {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      role: session.role,
    },
  });
}
