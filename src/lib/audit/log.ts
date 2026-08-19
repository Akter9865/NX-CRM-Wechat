import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export interface AuditLogPayload {
  accountId: string;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit event asynchronously in the database.
 * Never throws or blocks main workflow if audit logging fails.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    const sb = getServiceSupabase();
    await sb.from('audit_logs').insert({
      account_id: payload.accountId,
      actor_user_id: payload.actorUserId || null,
      action: payload.action,
      target_type: payload.targetType,
      target_id: payload.targetId || null,
      metadata: payload.metadata || {},
    });
  } catch (err) {
    console.warn('[audit] failed to record audit log:', err);
  }
}
