import { AdminRole, AdminPermission } from './types';

export const ROLE_DEFAULT_PERMISSIONS: Record<string, AdminPermission[]> = {
  super_admin: [
    'manage_clients',
    'delete_clients',
    'impersonate_clients',
    'manage_plans',
    'manage_subscriptions',
    'view_payments',
    'manage_whatsapp',
    'inspect_inbox',
    'inspect_automations',
    'manage_ai',
    'manage_feature_flags',
    'view_analytics',
    'view_logs',
    'view_system_health',
    'manage_settings',
    'manage_admin_users',
  ],
  superadmin: [
    'manage_clients',
    'delete_clients',
    'impersonate_clients',
    'manage_plans',
    'manage_subscriptions',
    'view_payments',
    'manage_whatsapp',
    'inspect_inbox',
    'inspect_automations',
    'manage_ai',
    'manage_feature_flags',
    'view_analytics',
    'view_logs',
    'view_system_health',
    'manage_settings',
    'manage_admin_users',
  ],
  admin: [
    'manage_clients',
    'impersonate_clients',
    'manage_plans',
    'manage_subscriptions',
    'view_payments',
    'manage_whatsapp',
    'inspect_inbox',
    'inspect_automations',
    'manage_ai',
    'manage_feature_flags',
    'view_analytics',
    'view_logs',
    'view_system_health',
    'manage_settings',
  ],
  support_manager: [
    'manage_clients',
    'impersonate_clients',
    'manage_subscriptions',
    'manage_whatsapp',
    'inspect_inbox',
    'inspect_automations',
    'view_logs',
    'view_system_health',
  ],
  support_agent: [
    'inspect_inbox',
    'inspect_automations',
    'manage_whatsapp',
    'view_logs',
  ],
  billing_manager: [
    'manage_clients',
    'manage_plans',
    'manage_subscriptions',
    'view_payments',
    'view_analytics',
    'view_logs',
  ],
  tech_manager: [
    'manage_whatsapp',
    'inspect_automations',
    'manage_ai',
    'manage_feature_flags',
    'view_logs',
    'view_system_health',
    'manage_settings',
  ],
};

export function hasPermission(
  role: AdminRole | string,
  permission: AdminPermission,
  customPermissions?: AdminPermission[]
): boolean {
  if (role === 'super_admin' || role === 'superadmin') return true;

  if (customPermissions && customPermissions.includes(permission)) {
    return true;
  }

  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return defaults.includes(permission);
}
