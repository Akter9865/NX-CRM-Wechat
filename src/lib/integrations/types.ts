/**
 * Types and interfaces for NX CRM Integrations Hub.
 * Supports Google Sheets, Zoho Mail / SMTP, Payment Gateways (Razorpay, PhonePe, Paytm, Stripe),
 * Google Calendar / Calendly, and Zapier / Custom Webhooks.
 */

export type IntegrationCategory = 'leads' | 'email' | 'payments' | 'calendar' | 'automation';

export type IntegrationId =
  | 'google_sheets'
  | 'zoho_mail'
  | 'smtp_mail'
  | 'razorpay'
  | 'phonepe'
  | 'paytm'
  | 'stripe'
  | 'calendly'
  | 'google_calendar'
  | 'zapier_webhook';

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  description: string;
  iconName: string;
  badge?: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'number' | 'select';
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: { label: string; value: string }[];
  }[];
}

export interface AccountIntegrationConfig {
  id: string;
  account_id: string;
  integration_id: IntegrationId;
  is_enabled: boolean;
  config: Record<string, any>;
  last_synced_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export const INTEGRATION_DEFINITIONS: Record<IntegrationId, IntegrationDefinition> = {
  google_sheets: {
    id: 'google_sheets',
    name: 'Google Sheets',
    category: 'leads',
    categoryLabel: 'Lead Sync & Data',
    description: 'Auto-export WhatsApp leads, qualified contacts, and inbound form data directly into your Google Sheets in real-time.',
    iconName: 'FileSpreadsheet',
    badge: 'Popular',
    fields: [
      {
        key: 'webhook_url',
        label: 'Google Apps Script / Webhook URL',
        type: 'url',
        placeholder: 'https://script.google.com/macros/s/.../exec',
        helpText: 'Deploy a Google Apps Script web app or webhook URL connected to your Sheet.',
        required: true,
      },
      {
        key: 'sheet_name',
        label: 'Sheet / Tab Name (Optional)',
        type: 'text',
        placeholder: 'WhatsApp Leads',
        helpText: 'The tab name inside your spreadsheet where new rows should be appended.',
      },
      {
        key: 'auto_sync_leads',
        label: 'Auto-Sync Incoming Leads',
        type: 'select',
        options: [
          { label: 'Yes - Sync all new contacts automatically', value: 'all' },
          { label: 'Only Qualified Leads (via Flow Builder / Tags)', value: 'tagged' },
          { label: 'Disabled (Manual / Flow trigger only)', value: 'manual' },
        ],
      },
    ],
  },
  zoho_mail: {
    id: 'zoho_mail',
    name: 'Zoho Mail & Zoho CRM',
    category: 'email',
    categoryLabel: 'Email & Notifications',
    description: 'Send instant email notifications to your sales team via Zoho Mail when a high-priority WhatsApp lead arrives.',
    iconName: 'Mail',
    fields: [
      {
        key: 'smtp_host',
        label: 'Zoho SMTP Host',
        type: 'text',
        placeholder: 'smtppro.zoho.com',
        required: true,
      },
      {
        key: 'smtp_port',
        label: 'SMTP Port',
        type: 'number',
        placeholder: '465',
        required: true,
      },
      {
        key: 'sender_email',
        label: 'Sender Email Address',
        type: 'text',
        placeholder: 'sales@yourdomain.com',
        required: true,
      },
      {
        key: 'app_password',
        label: 'Zoho App Password',
        type: 'password',
        placeholder: '••••••••••••••••',
        helpText: 'Generate an App Password from Zoho Accounts > Security.',
        required: true,
      },
      {
        key: 'alert_recipients',
        label: 'Alert Recipient Emails (comma-separated)',
        type: 'text',
        placeholder: 'team@yourdomain.com, manager@yourdomain.com',
      },
    ],
  },
  smtp_mail: {
    id: 'smtp_mail',
    name: 'Custom SMTP Email',
    category: 'email',
    categoryLabel: 'Email & Notifications',
    description: 'Connect any standard SMTP email server (Gmail, Outlook, Hostinger, AWS SES) for outbound lead alerts.',
    iconName: 'Send',
    fields: [
      {
        key: 'smtp_host',
        label: 'SMTP Host',
        type: 'text',
        placeholder: 'smtp.gmail.com',
        required: true,
      },
      {
        key: 'smtp_port',
        label: 'SMTP Port',
        type: 'number',
        placeholder: '587',
        required: true,
      },
      {
        key: 'username',
        label: 'Username / Email',
        type: 'text',
        placeholder: 'alerts@yourdomain.com',
        required: true,
      },
      {
        key: 'password',
        label: 'Password / App Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
      },
    ],
  },
  razorpay: {
    id: 'razorpay',
    name: 'Razorpay Payments',
    category: 'payments',
    categoryLabel: 'Payment Gateways',
    description: 'Generate dynamic Razorpay payment links and UPI QR codes directly within WhatsApp chat and automations.',
    iconName: 'CreditCard',
    badge: 'Instant UPI',
    fields: [
      {
        key: 'key_id',
        label: 'Razorpay Key ID',
        type: 'text',
        placeholder: 'rzp_live_xxxxxxxxxxxxxx',
        required: true,
      },
      {
        key: 'key_secret',
        label: 'Razorpay Key Secret',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
      },
      {
        key: 'currency',
        label: 'Default Currency',
        type: 'select',
        options: [
          { label: 'INR (₹)', value: 'INR' },
          { label: 'USD ($)', value: 'USD' },
          { label: 'EUR (€)', value: 'EUR' },
          { label: 'AED (د.إ)', value: 'AED' },
        ],
      },
    ],
  },
  phonepe: {
    id: 'phonepe',
    name: 'PhonePe PG',
    category: 'payments',
    categoryLabel: 'Payment Gateways',
    description: 'Collect UPI and card payments using PhonePe PG payment links in WhatsApp conversations.',
    iconName: 'Smartphone',
    fields: [
      {
        key: 'merchant_id',
        label: 'PhonePe Merchant ID',
        type: 'text',
        placeholder: 'PGTESTPAYUAT',
        required: true,
      },
      {
        key: 'salt_key',
        label: 'Salt Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
      },
      {
        key: 'salt_index',
        label: 'Salt Index',
        type: 'number',
        placeholder: '1',
        required: true,
      },
    ],
  },
  paytm: {
    id: 'paytm',
    name: 'Paytm All-In-One PG',
    category: 'payments',
    categoryLabel: 'Payment Gateways',
    description: 'Integrate Paytm Merchant Gateway to send instant payment links to WhatsApp customers.',
    iconName: 'Wallet',
    fields: [
      {
        key: 'merchant_id',
        label: 'Paytm MID (Merchant ID)',
        type: 'text',
        placeholder: 'xxxxxxxxxxxxxxxxxxxx',
        required: true,
      },
      {
        key: 'merchant_key',
        label: 'Merchant Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
      },
    ],
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe Payments',
    category: 'payments',
    categoryLabel: 'Payment Gateways',
    description: 'Global credit cards and international payment collection via Stripe Checkout links.',
    iconName: 'DollarSign',
    fields: [
      {
        key: 'publishable_key',
        label: 'Stripe Publishable Key',
        type: 'text',
        placeholder: 'pk_live_xxxxxxxxxxxxxx',
        required: true,
      },
      {
        key: 'secret_key',
        label: 'Stripe Secret Key',
        type: 'password',
        placeholder: 'sk_live_••••••••••••••••',
        required: true,
      },
    ],
  },
  calendly: {
    id: 'calendly',
    name: 'Calendly & Google Calendar',
    category: 'calendar',
    categoryLabel: 'Booking & Scheduling',
    description: 'Send automated consultation booking links and sync scheduled appointment details with WhatsApp contacts.',
    iconName: 'Calendar',
    fields: [
      {
        key: 'booking_link',
        label: 'Calendly / Calendar Booking URL',
        type: 'url',
        placeholder: 'https://calendly.com/your-username/30min',
        required: true,
      },
      {
        key: 'custom_message',
        label: 'Default Invitation Message',
        type: 'text',
        placeholder: 'Please select a convenient time for our consultation call: {{booking_link}}',
      },
    ],
  },
  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar Direct',
    category: 'calendar',
    categoryLabel: 'Booking & Scheduling',
    description: 'Direct Google Calendar appointment booking and event link generation.',
    iconName: 'CalendarDays',
    fields: [
      {
        key: 'calendar_id',
        label: 'Google Calendar ID',
        type: 'text',
        placeholder: 'primary or your_email@gmail.com',
        required: true,
      },
      {
        key: 'booking_duration_mins',
        label: 'Default Meeting Duration (Minutes)',
        type: 'number',
        placeholder: '30',
      },
    ],
  },
  zapier_webhook: {
    id: 'zapier_webhook',
    name: 'Zapier / Make.com / Pabbly',
    category: 'automation',
    categoryLabel: 'Custom Webhooks',
    description: 'Push CRM events (new message, contact created, flow triggered) to 5,000+ external apps via Webhooks.',
    iconName: 'Webhook',
    badge: 'Universal',
    fields: [
      {
        key: 'webhook_url',
        label: 'Destination Webhook URL',
        type: 'url',
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        required: true,
      },
      {
        key: 'secret_token',
        label: 'Webhook Header Secret (Optional)',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
  },
};
