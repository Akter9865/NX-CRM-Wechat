import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for the AI auto-reply path.
// Mirrors src/lib/flows/admin-client.ts and src/lib/automations/admin-client.ts
// — the inbound webhook has no `auth.uid()`, so the bot reads config +
// conversation state and sends through the service role.
let _adminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'placeholder-service-key',
    )
  }
  return _adminClient
}
