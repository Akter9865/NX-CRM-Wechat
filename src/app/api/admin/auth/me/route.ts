import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin/auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      permissions: session.permissions || [],
    },
  });
}
