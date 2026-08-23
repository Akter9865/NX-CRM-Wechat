import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    const supabase = getAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase().trim();

    let query = supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: inquiries, error } = await query;
    if (error) throw error;

    let list = inquiries || [];
    if (search) {
      list = list.filter(
        (inq) =>
          inq.name?.toLowerCase().includes(search) ||
          inq.email?.toLowerCase().includes(search) ||
          inq.company?.toLowerCase().includes(search) ||
          inq.subject?.toLowerCase().includes(search) ||
          inq.message?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, inquiries: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch inquiries';
    console.error('[Admin Inquiries GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession();
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Inquiry ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updatePayload.status = status;
      if (status === 'responded') {
        updatePayload.responded_at = new Date().toISOString();
        updatePayload.responded_by = adminSession.email;
      }
    }
    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'inquiry.update',
      targetType: 'inquiry',
      targetId: id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, inquiry: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update inquiry';
    console.error('[Admin Inquiries PATCH Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession();
    const supabase = getAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Inquiry ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('contact_inquiries').delete().eq('id', id);
    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'inquiry.delete',
      targetType: 'inquiry',
      targetId: id,
    });

    return NextResponse.json({ success: true, message: 'Inquiry deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete inquiry';
    console.error('[Admin Inquiries DELETE Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
