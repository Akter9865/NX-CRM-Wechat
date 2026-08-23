import { PlanConfig, PLANS, PLAN_LIST, PlanId } from './plans';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createSupabaseClient(url, key);
}

export interface DatabasePlanRow {
  id: string;
  name: string;
  slug?: string;
  price: number;
  currency?: string;
  contact_limit: number | null;
  monthly_message_limit: number | null;
  whatsapp_connection_limit: number | null;
  is_active: boolean;
}

export interface DatabasePlanFeatureRow {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
}

/**
 * Loads dynamic plans from Supabase database with fallback to default PLANS.
 * Ensures any edits made in /admin/plans are immediately reflected across public pricing,
 * feature comparison matrix, and billing checkout.
 */
export async function getDynamicPlans(): Promise<PlanConfig[]> {
  try {
    const supabase = getSupabase();
    const [{ data: dbPlans, error: pErr }, { data: dbFeatures }] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).order('price', { ascending: true }),
      supabase.from('plan_features').select('*'),
    ]);

    if (pErr || !dbPlans || dbPlans.length === 0) {
      return PLAN_LIST;
    }

    const featureMap = new Map<string, DatabasePlanFeatureRow[]>();
    (dbFeatures || []).forEach((f) => {
      const list = featureMap.get(f.plan_id) || [];
      list.push(f);
      featureMap.set(f.plan_id, list);
    });

    return dbPlans.map((row) => {
      const planId = row.id as PlanId;
      const defaultPlan = PLANS[planId];
      const customFeatures = featureMap.get(row.id);

      let features = defaultPlan?.features || [];

      if (customFeatures && customFeatures.length > 0) {
        features = customFeatures.map((cf) => ({
          name: cf.feature_key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          included: cf.enabled,
        }));
      }

      return {
        id: planId,
        name: row.name || defaultPlan?.name || row.id.toUpperCase(),
        price: row.price,
        period: 'month',
        currency: 'INR',
        currencySymbol: '₹',
        description: defaultPlan?.description || `${row.name} subscription plan for growing businesses.`,
        badge: planId === 'pro' ? 'Popular' : planId === 'business' ? 'Recommended' : undefined,
        contactLimit: row.contact_limit,
        monthlyMessageLimit: row.monthly_message_limit,
        whatsappConnectionLimit: row.whatsapp_connection_limit,
        features,
        razorpayPlanId: defaultPlan?.razorpayPlanId,
      };
    });
  } catch (err) {
    console.error('[getDynamicPlans] Error fetching dynamic plans, falling back to static:', err);
    return PLAN_LIST;
  }
}
