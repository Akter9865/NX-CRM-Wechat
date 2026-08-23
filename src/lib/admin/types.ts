export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'support_manager'
  | 'support_agent'
  | 'billing_manager'
  | 'tech_manager';

export type AdminPermission =
  | 'manage_clients'
  | 'delete_clients'
  | 'impersonate_clients'
  | 'manage_plans'
  | 'manage_subscriptions'
  | 'view_payments'
  | 'manage_whatsapp'
  | 'inspect_inbox'
  | 'inspect_automations'
  | 'manage_ai'
  | 'manage_feature_flags'
  | 'view_analytics'
  | 'view_logs'
  | 'view_system_health'
  | 'manage_settings'
  | 'manage_admin_users';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions: AdminPermission[];
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  adminRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabledGlobally: boolean;
  allowedPlans: string[];
  clientOverrides: Record<string, boolean>;
  updatedAt: string;
}

export interface SystemSettings {
  general: {
    platformName: string;
    companyName: string;
    supportEmail: string;
    salesEmail: string;
    defaultTrialDays: number;
    defaultCurrency: string;
    maintenanceMode: boolean;
  };
  billing: {
    gracePeriodDays: number;
    taxPercentage: number;
    invoicePrefix: string;
    autoSuspendExpired: boolean;
  };
  whatsapp: {
    metaApiVersion: string;
    defaultWebhookTimeoutMs: number;
    maxConnectionsPerClientPro: number;
    maxConnectionsPerClientBusiness: number;
  };
}

export interface AdminOverviewStats {
  totalClients: number;
  activeClients: number;
  trialClients: number;
  expiredClients: number;
  suspendedClients: number;
  totalContacts: number;
  totalMessages: number;
  messagesToday: number;
  activeConversations: number;
  whatsappConnections: number;
  activeAutomations: number;
  activeFlows: number;
  aiUsageTotal: number;
  monthlyRevenue: number;
  pendingPayments: number;
  failedPayments: number;
  expiringSubscriptions: number;
  totalInquiries?: number;
  newInquiries?: number;
  planCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  recentActivities: AdminAuditLog[];
}

export interface FullClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  createdAt: string;
  status: 'active' | 'suspended' | 'trial' | 'past_due' | 'expired';
  notes: string | null;
  currentPlan: {
    id: string;
    name: string;
    price: number;
    contactLimit: number | null;
    monthlyMessageLimit: number | null;
    whatsappLimit: number | null;
  };
  subscription: {
    id: string;
    status: string;
    startDate: string;
    expiryDate: string;
    gracePeriodEnd: string | null;
    razorpaySubscriptionId: string | null;
  } | null;
  usage: {
    contactsCount: number;
    messagesSentThisMonth: number;
    messagesReceivedThisMonth: number;
    automationRunsThisMonth: number;
    whatsappConnectionsCount: number;
    teamMembersCount: number;
    automationsCount: number;
    flowsCount: number;
    aiKnowledgeCount: number;
  };
  lastActiveAt: string | null;
  whatsappConnections: {
    id: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    status: string;
  }[];
  recentPayments: {
    id: string;
    razorpayPaymentId: string | null;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
}
