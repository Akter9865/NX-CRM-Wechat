import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';
import { AdminRole, AdminPermission } from '@/lib/admin/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('manage_admin_users');
    const supabase = getAdminSupabaseClient();

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, permissions, status, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, adminUsers: users || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch admin users';
    console.error('[Admin Users GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_admin_users');
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const { email, password, fullName, role, permissions } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, password, full name, and role are required' },
        { status: 400 }
      );
    }

    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        email: email.trim().toLowerCase(),
        password_hash: password, // In production, stored with hash
        full_name: fullName,
        role: role as AdminRole,
        permissions: Array.isArray(permissions) ? permissions : [],
        status: 'active',
      })
      .select('id, email, full_name, role, permissions, status, created_at')
      .single();

    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'admin_user.create',
      targetType: 'admin_user',
      targetId: newUser.id,
      details: { email, fullName, role },
    });

    return NextResponse.json({ success: true, adminUser: newUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create admin user';
    console.error('[Admin Users POST Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_admin_users');
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const { id, fullName, role, permissions, status, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (role !== undefined) updatePayload.role = role;
    if (Array.isArray(permissions)) updatePayload.permissions = permissions;
    if (status !== undefined) updatePayload.status = status;
    if (password) updatePayload.password_hash = password;

    const { data: updatedUser, error } = await supabase
      .from('admin_users')
      .update(updatePayload)
      .eq('id', id)
      .select('id, email, full_name, role, permissions, status, updated_at')
      .single();

    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'admin_user.update',
      targetType: 'admin_user',
      targetId: id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, adminUser: updatedUser });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update admin user';
    console.error('[Admin Users PATCH Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_admin_users');
    const supabase = getAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'admin_user.delete',
      targetType: 'admin_user',
      targetId: id,
    });

    return NextResponse.json({ success: true, message: 'Admin user deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete admin user';
    console.error('[Admin Users DELETE Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
