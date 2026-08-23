import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAllFeatureFlags, updateFeatureFlag } from '@/lib/admin/feature-flags';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('manage_feature_flags');
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ success: true, featureFlags: flags });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch feature flags';
    console.error('[Admin Features GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_feature_flags');
    const body = await req.json();
    const { id, enabledGlobally, allowedPlans, clientOverrides, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Feature flag ID is required' }, { status: 400 });
    }

    const success = await updateFeatureFlag(id, {
      enabledGlobally,
      allowedPlans,
      clientOverrides,
      description,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
    }

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'feature_flag.update',
      targetType: 'feature_flag',
      targetId: id,
      details: { enabledGlobally, allowedPlans, clientOverrides },
    });

    return NextResponse.json({ success: true, message: `Feature flag '${id}' updated` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update feature flag';
    console.error('[Admin Features PATCH Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
