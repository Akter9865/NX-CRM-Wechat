import { getAdminSupabaseClient } from './admin-client';
import { AdminRole } from './types';

export interface AuditLogPayload {
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logAdminAction(payload: AuditLogPayload): Promise<void> {
  try {
    const supabase = getAdminSupabaseClient();
    await supabase.from('admin_audit_logs').insert({
      admin_email: payload.adminEmail,
      admin_role: payload.adminRole,
      action: payload.action,
      target_type: payload.targetType,
      target_id: payload.targetId || null,
      details: payload.details || {},
      ip_address: payload.ipAddress || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[logAdminAction] Error writing audit log:', err);
  }
}
