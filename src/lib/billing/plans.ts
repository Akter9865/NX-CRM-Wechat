export type PlanId = 'free' | 'pro' | 'business' | 'enterprise';

export interface PlanFeature {
  name: string;
  included: boolean;
  note?: string;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // in INR
  period: 'month';
  currency: 'INR';
  currencySymbol: '₹';
  description: string;
  badge?: string;
  contactLimit: number | null; // null = unlimited
  monthlyMessageLimit: number | null; // null = unlimited
  whatsappConnectionLimit: number | null; // null = unlimited
  features: PlanFeature[];
  razorpayPlanId?: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'Perfect for exploring WhatsApp CRM and getting started.',
    contactLimit: 10,
    monthlyMessageLimit: 200,
    whatsappConnectionLimit: 1,
    features: [
      { name: '10 Contacts', included: true },
      { name: '200 Messages / month', included: true },
      { name: '1 WhatsApp Connection', included: true },
      { name: 'Shared Inbox & Basic CRM', included: true },
      { name: 'Basic Templates & Quick Replies', included: true },
      { name: 'Visual Automations (Up to 3 flows)', included: true },
      { name: 'Contact Deletion', included: false, note: 'Business & Enterprise only' },
      { name: 'Broadcast Campaigns', included: false, note: 'Coming Soon on Business' },
      { name: 'API & Webhook Access', included: false },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 499,
    period: 'month',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'Ideal for growing businesses needing higher capacity and unlimited messaging.',
    badge: 'Popular',
    contactLimit: 700,
    monthlyMessageLimit: null, // Unlimited*
    whatsappConnectionLimit: 1,
    features: [
      { name: '700 Contacts max', included: true },
      { name: 'Unlimited Messages*', included: true, note: 'Subject to Meta policies' },
      { name: '1 WhatsApp Connection', included: true },
      { name: 'Advanced CRM & Sales Pipelines', included: true },
      { name: 'Full Visual Automation Builder', included: true },
      { name: 'AI Auto-Reply & Google Gemini', included: true },
      { name: 'Full API & Webhook Access', included: true },
      { name: 'Contact Deletion', included: false, note: 'Business & Enterprise only' },
      { name: 'Broadcast Campaigns', included: false, note: 'Coming Soon on Business' },
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 3000,
    period: 'month',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'For scaling teams that need advanced automation and campaign eligibility.',
    badge: 'Recommended',
    contactLimit: 7000,
    monthlyMessageLimit: null, // Unlimited*
    whatsappConnectionLimit: 5,
    features: [
      { name: '7,000 Contacts max', included: true },
      { name: 'Unlimited Messages*', included: true },
      { name: '5 WhatsApp API Connections', included: true },
      { name: 'Contact Deletion & Management', included: true },
      { name: 'Advanced Automation Engine', included: true },
      { name: 'Broadcast Eligibility (Coming Soon)', included: true },
      { name: 'Bulk Template Eligibility (Coming Soon)', included: true },
      { name: 'Multi-agent Shared Inbox & Roles', included: true },
      { name: 'Priority Support', included: true },
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 8999,
    period: 'month',
    currency: 'INR',
    currencySymbol: '₹',
    description: 'High-volume organizations requiring unlimited scale and custom capabilities.',
    contactLimit: null, // Unlimited
    monthlyMessageLimit: null, // Unlimited*
    whatsappConnectionLimit: null, // Unlimited
    features: [
      { name: 'Unlimited Contacts', included: true },
      { name: 'Unlimited Messages*', included: true },
      { name: 'Unlimited WhatsApp Connections', included: true },
      { name: 'Full Contact Deletion & Management', included: true },
      { name: 'Enterprise Visual Automations', included: true },
      { name: 'Broadcast Eligibility (Coming Soon)', included: true },
      { name: 'Bulk Messaging Eligibility (Coming Soon)', included: true },
      { name: 'Dedicated Support & Onboarding', included: true },
      { name: 'Custom Integrations & SLA', included: true },
    ],
  },
};

export const PLAN_LIST: PlanConfig[] = [
  PLANS.free,
  PLANS.pro,
  PLANS.business,
  PLANS.enterprise,
];
