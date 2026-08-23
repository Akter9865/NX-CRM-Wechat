import { getAdminSupabaseClient } from './admin-client';
import { FeatureFlag } from './types';

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('id');

    if (error || !data) {
      console.error('[getAllFeatureFlags] error:', error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      enabledGlobally: row.enabled_globally,
      allowedPlans: Array.isArray(row.allowed_plans) ? row.allowed_plans : [],
      clientOverrides: typeof row.client_overrides === 'object' && row.client_overrides ? row.client_overrides : {},
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[getAllFeatureFlags] exception:', err);
    return [];
  }
}

export async function isFeatureEnabledForAccount(
  accountId: string,
  featureKey: string,
  planId?: string
): Promise<boolean> {
  try {
    const supabase = getAdminSupabaseClient();

    const { data: flag } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', featureKey)
      .single();

    if (!flag) {
      // Default to allowed for baseline features, false for broadcast
      return featureKey !== 'broadcast';
    }

    // 1. Check client override first
    if (flag.client_overrides && typeof flag.client_overrides[accountId] === 'boolean') {
      return flag.client_overrides[accountId];
    }

    // 2. Check global enable
    if (!flag.enabled_globally) {
      return false;
    }

    // 3. If plan provided, check plan allowance
    if (planId && Array.isArray(flag.allowed_plans)) {
      return flag.allowed_plans.includes(planId);
    }

    return true;
  } catch (err) {
    console.error('[isFeatureEnabledForAccount] error:', err);
    return true;
  }
}

export async function updateFeatureFlag(
  featureKey: string,
  updates: {
    enabledGlobally?: boolean;
    allowedPlans?: string[];
    clientOverrides?: Record<string, boolean>;
    description?: string;
  }
): Promise<boolean> {
  try {
    const supabase = getAdminSupabaseClient();
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.enabledGlobally === 'boolean') {
      updatePayload.enabled_globally = updates.enabledGlobally;
    }
    if (Array.isArray(updates.allowedPlans)) {
      updatePayload.allowed_plans = updates.allowedPlans;
    }
    if (updates.clientOverrides) {
      updatePayload.client_overrides = updates.clientOverrides;
    }
    if (updates.description) {
      updatePayload.description = updates.description;
    }

    const { error } = await supabase
      .from('feature_flags')
      .update(updatePayload)
      .eq('id', featureKey);

    return !error;
  } catch (err) {
    console.error('[updateFeatureFlag] error:', err);
    return false;
  }
}
