import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { checkCanDeleteContacts } from '@/lib/billing/entitlements';
import { logAuditEvent } from '@/lib/audit/log';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key'
  );
}

/**
 * POST /api/contacts/delete
 * 
 * Secure endpoint to delete one or more contacts with Plan Entitlement Enforcement.
 * Contact deletion is strictly restricted to Business (₹3,000/mo) and Enterprise (₹8,999/mo) plans.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id, account_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const accountId = profile.account_id as string;
    const role = (profile.account_role as string) || 'viewer';

    // Viewers cannot delete data
    if (role === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to delete contacts.' },
        { status: 403 }
      );
    }

    // Check Plan Entitlement: Contact deletion is only allowed on Business & Enterprise plans
    const entitlement = await checkCanDeleteContacts(accountId, getAdminClient());
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error: entitlement.message || 'Contact deletion is only available on Business and Enterprise plans. Please upgrade to manage contacts.',
          code: 'plan_upgrade_required',
          required_plans: ['business', 'enterprise'],
          current_plan: entitlement.planId,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids
      : body.id
      ? [body.id]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No contact IDs provided' }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify all contacts belong to caller's account
    const { data: validContacts, error: queryError } = await admin
      .from('contacts')
      .select('id, name, phone')
      .eq('account_id', accountId)
      .in('id', ids);

    if (queryError) {
      console.error('[contacts/delete] Error querying contacts:', queryError);
      return NextResponse.json({ error: 'Failed to verify contacts' }, { status: 500 });
    }

    const contactsList = (validContacts || []) as Array<{ id: string; name: string | null; phone: string | null }>;
    const validIds = contactsList.map((c) => c.id);

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No matching contacts found to delete' }, { status: 404 });
    }

    // Delete associated relations first
    await admin.from('contact_tags').delete().in('contact_id', validIds);
    await admin.from('contact_notes').delete().in('contact_id', validIds);
    await admin.from('contact_custom_values').delete().in('contact_id', validIds);

    // Delete the contacts
    const { error: deleteError } = await admin
      .from('contacts')
      .delete()
      .eq('account_id', accountId)
      .in('id', validIds);

    if (deleteError) {
      console.error('[contacts/delete] Error deleting contacts:', deleteError);
      return NextResponse.json({ error: 'Failed to delete contacts' }, { status: 500 });
    }

    // Audit log
    await logAuditEvent({
      accountId,
      actorUserId: user.id,
      action: 'contact_deleted',
      targetType: 'contact',
      targetId: validIds.length === 1 ? validIds[0] : `${validIds.length} contacts`,
      metadata: {
        deleted_count: validIds.length,
        requested_ids: ids,
        deleted_ids: validIds,
        deleted_names: contactsList.map((c) => c.name || c.phone || ''),
      },
    });

    return NextResponse.json({
      success: true,
      deleted_count: validIds.length,
    });
  } catch (err: unknown) {
    console.error('[contacts/delete] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
