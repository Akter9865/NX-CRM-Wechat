import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _superAdminClient: SupabaseClient | null = null;

/**
 * Returns a service-role Supabase client for SuperAdmin operations.
 * Bypasses RLS to query and manage cross-tenant accounts, subscriptions, and profiles.
 */
export function getSuperAdminServiceClient(): SupabaseClient {
  if (!_superAdminClient) {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-service-key';

    _superAdminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _superAdminClient;
}
