import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('manage_plans');
    const supabase = getAdminSupabaseClient();

    const [{ data: plans, error: pErr }, { data: features }] = await Promise.all([
      supabase.from('plans').select('*').order('price', { ascending: true }),
      supabase.from('plan_features').select('*'),
    ]);

    if (pErr) throw pErr;

    const enrichedPlans = (plans || []).map((p) => {
      const planFeatures = (features || []).filter((f) => f.plan_id === p.id);
      return {
        ...p,
        features: planFeatures,
      };
    });

    return NextResponse.json({ success: true, plans: enrichedPlans });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch plans';
    console.error('[Admin Plans GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_plans');
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const {
      id,
      name,
      slug,
      price,
      currency,
      contactLimit,
      monthlyMessageLimit,
      whatsappConnectionLimit,
      isActive,
      features,
    } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json(
        { error: 'Plan id, name, and price are required' },
        { status: 400 }
      );
    }

    const { data: newPlan, error: pErr } = await supabase
      .from('plans')
      .insert({
        id: id.toLowerCase().trim(),
        name,
        slug: slug || id.toLowerCase().trim(),
        price: Number(price),
        currency: currency || 'INR',
        billing_interval: 'month',
        contact_limit: contactLimit ? Number(contactLimit) : null,
        monthly_message_limit: monthlyMessageLimit ? Number(monthlyMessageLimit) : null,
        whatsapp_connection_limit: whatsappConnectionLimit ? Number(whatsappConnectionLimit) : null,
        is_active: isActive !== undefined ? Boolean(isActive) : true,
      })
      .select('*')
      .single();

    if (pErr) throw pErr;

    // Insert features if provided
    if (Array.isArray(features) && features.length > 0) {
      const featureInserts = features.map((f: { key: string; enabled: boolean; limit?: number }) => ({
        plan_id: newPlan.id,
        feature_key: f.key,
        enabled: f.enabled,
        limit_value: f.limit || null,
      }));
      await supabase.from('plan_features').upsert(featureInserts, { onConflict: 'plan_id, feature_key' });
    }

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'plan.create',
      targetType: 'plan',
      targetId: newPlan.id,
      details: { name, price },
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create plan';
    console.error('[Admin Plan POST Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_plans');
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const {
      id,
      name,
      price,
      contactLimit,
      monthlyMessageLimit,
      whatsappConnectionLimit,
      isActive,
      features,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name;
    if (price !== undefined) updatePayload.price = Number(price);
    if (contactLimit !== undefined) updatePayload.contact_limit = contactLimit ? Number(contactLimit) : null;
    if (monthlyMessageLimit !== undefined) updatePayload.monthly_message_limit = monthlyMessageLimit ? Number(monthlyMessageLimit) : null;
    if (whatsappConnectionLimit !== undefined) updatePayload.whatsapp_connection_limit = whatsappConnectionLimit ? Number(whatsappConnectionLimit) : null;
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    const { data: updatedPlan, error: pErr } = await supabase
      .from('plans')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (pErr) throw pErr;

    // Update plan features if provided
    if (Array.isArray(features)) {
      for (const f of features) {
        if (f.key) {
          await supabase.from('plan_features').upsert(
            {
              plan_id: id,
              feature_key: f.key,
              enabled: Boolean(f.enabled),
              limit_value: f.limit ? Number(f.limit) : null,
            },
            { onConflict: 'plan_id, feature_key' }
          );
        }
      }
    }

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'plan.update',
      targetType: 'plan',
      targetId: id,
      details: updatePayload,
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update plan';
    console.error('[Admin Plan PATCH Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
