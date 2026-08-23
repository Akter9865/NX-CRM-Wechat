export type IntegrationCategory =
  | 'messaging'
  | 'email'
  | 'productivity'
  | 'crm'
  | 'collaboration'
  | 'payments'
  | 'developer';

export interface MarketingIntegration {
  slug: string;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  status: 'Available' | 'Coming Soon';
  badge?: string;
  description: string;
  tagline: string;
  whatItDoes: string;
  howItWorks: string;
  keyFeatures: string[];
  setupSteps: string[];
  securityInfo: string;
  iconName: string;
}

export const MARKETING_INTEGRATIONS: MarketingIntegration[] = [
  {
    slug: 'whatsapp',
    name: 'WhatsApp Cloud API',
    category: 'messaging',
    categoryLabel: 'Messaging',
    status: 'Available',
    badge: 'Core Platform',
    iconName: 'MessageSquare',
    tagline: 'Official Meta Graph API integration with high throughput.',
    description: 'Connect your official WhatsApp Business number for shared inbox messaging, contact management, verified templates, and visual automations.',
    whatItDoes: 'Connects your official WhatsApp Business account directly with NX CRM via Meta Graph API for bidirectional real-time messaging.',
    howItWorks: 'You generate System User access credentials in Meta Developer Console, enter your Phone Number ID and WABA ID in NX CRM Settings, and NX CRM handles webhook verification and delivery events.',
    keyFeatures: [
      'Official Meta WhatsApp Cloud API connection',
      'Real-time delivery receipts (Sent, Delivered, Read)',
      'Verified HSM message template sync',
      'Multi-agent shared inbox with 24h timer',
      'Visual workflow automation triggers',
    ],
    setupSteps: [
      'Create a Meta Developer App under your Meta Business Account',
      'Generate a permanent System User Token with whatsapp_business_messaging permissions',
      'Navigate to NX CRM Settings → WhatsApp tab in your workspace',
      'Paste your Phone Number ID, WABA ID, and System User Token',
      'Click Test Connection & Save to verify webhook handshake',
    ],
    securityInfo: 'All access tokens are AES-256-GCM encrypted in the database. Webhook signatures are validated using HMAC-SHA256.',
  },
  {
    slug: 'telegram',
    name: 'Telegram Bot API',
    category: 'messaging',
    categoryLabel: 'Messaging',
    status: 'Available',
    badge: 'BETA',
    iconName: 'Send',
    tagline: 'Two-way Telegram channel messaging and notifications.',
    description: 'Bridge customer chats and team notifications through official Telegram Bot API webhooks.',
    whatItDoes: 'Allows support agents to receive customer inquiries from Telegram and send notifications to company broadcast channels.',
    howItWorks: 'Create a bot using @BotFather on Telegram, paste your Bot Token in NX CRM Settings, and webhook updates are mirrored in your inbox.',
    keyFeatures: [
      'Instant bot creation via @BotFather',
      'Receive inbound Telegram queries in CRM inbox',
      'Outbound team alert broadcasts',
      'Flow automation triggers from Telegram messages',
    ],
    setupSteps: [
      'Open Telegram and message @BotFather to create a new bot',
      'Copy your generated HTTP API Bot Token',
      'Enter the token in NX CRM Settings → Integrations → Telegram',
      'Enable webhook listening and test communication',
    ],
    securityInfo: 'Telegram tokens are stored encrypted and validated per webhook call.',
  },
  {
    slug: 'instagram',
    name: 'Instagram Direct',
    category: 'messaging',
    categoryLabel: 'Messaging',
    status: 'Coming Soon',
    badge: 'Coming Soon',
    iconName: 'Instagram',
    tagline: 'Unified Instagram DM inbox and comment-to-DM flows.',
    description: 'Manage Instagram Direct messages and story replies inside the NX CRM shared inbox.',
    whatItDoes: 'Brings Instagram Direct conversations into the same workspace as WhatsApp for omnichannel customer support.',
    howItWorks: 'Will connect via Meta Instagram Graph API using standard OAuth permission grant.',
    keyFeatures: [
      'Unified Instagram Direct customer conversations',
      'Story reply and post comment lead capture',
      'Keyword-based auto-replies for product inquiries',
      'Multi-agent conversation assignment',
    ],
    setupSteps: [
      'Feature is currently in development (Coming Soon)',
      'Will require a linked Instagram Professional Account & Facebook Page',
      'Will support one-click OAuth connect from NX CRM dashboard',
    ],
    securityInfo: 'Will leverage official Meta Graph API OAuth with least-privilege token scopes.',
  },
  {
    slug: 'gmail',
    name: 'Gmail & SMTP Email',
    category: 'email',
    categoryLabel: 'Email & Alerts',
    status: 'Available',
    iconName: 'Mail',
    tagline: 'Lead forwarding and instant alert emails via SMTP.',
    description: 'Connect standard SMTP credentials (Gmail, Outlook, Hostinger) to automatically dispatch lead notification emails to your sales reps.',
    whatItDoes: 'Sends immediate email notifications to designated team members whenever a high-priority WhatsApp lead is tagged or captured.',
    howItWorks: 'Provide your SMTP host (e.g. smtp.gmail.com), port (587/465), and App Password. Visual flows trigger email dispatches.',
    keyFeatures: [
      'Standard SMTP compatibility (Gmail, Outlook, Custom)',
      'Customizable email templates with contact variable insertion',
      'Multi-recipient sales alert forwarding',
      'Zero third-party email provider lock-in',
    ],
    setupSteps: [
      'Generate an App Password from your Google / Email provider account',
      'Go to NX CRM Settings → Integrations → Custom SMTP',
      'Enter your SMTP host, port, username, and app password',
      'Send a test verification email',
    ],
    securityInfo: 'SMTP credentials are AES-256 encrypted. SSL/TLS encryption is enforced for all outbound mail transmissions.',
  },
  {
    slug: 'google-calendar',
    name: 'Google Calendar & Calendly',
    category: 'productivity',
    categoryLabel: 'Productivity & Booking',
    status: 'Available',
    iconName: 'Calendar',
    tagline: 'Send consultation booking links and sync appointments.',
    description: 'Automate appointment scheduling by sharing dynamic Calendly and Google Calendar links in WhatsApp chats.',
    whatItDoes: 'Enables sales agents and visual automation flows to share direct booking links and capture scheduled meeting confirmations.',
    howItWorks: 'Configure your booking URLs in Settings. Flows automatically substitute customer details and dispatch personalized calendar links.',
    keyFeatures: [
      'Automated meeting scheduling via WhatsApp',
      'Calendly & Google Calendar link generation',
      'Pre-meeting reminder automation triggers',
      'Contact field sync on confirmed appointment',
    ],
    setupSteps: [
      'Copy your Calendly or Google Calendar booking URL',
      'Go to NX CRM Settings → Integrations → Calendly & Calendar',
      'Paste your booking link and set default consultation template',
      'Add calendar nodes to your visual automation flows',
    ],
    securityInfo: 'All links are generated using HTTPS. No private calendar data is stored on NX CRM servers without explicit user grant.',
  },
  {
    slug: 'google-sheets',
    name: 'Google Sheets Live Sync',
    category: 'productivity',
    categoryLabel: 'Productivity & Data',
    status: 'Available',
    badge: 'Popular',
    iconName: 'FileSpreadsheet',
    tagline: 'Auto-export WhatsApp leads into Google Sheets in real-time.',
    description: 'Automatically append new contacts, qualified leads, and flow form submissions into your Google Sheets spreadsheets.',
    whatItDoes: 'Creates an automatic real-time spreadsheet row for every inbound WhatsApp lead, including name, phone number, tags, and custom fields.',
    howItWorks: 'Deploy a lightweight Google Apps Script Web App on your spreadsheet and paste the Webhook URL into NX CRM.',
    keyFeatures: [
      'Real-time row appending on lead capture',
      'Selective syncing (All leads vs Tagged/Qualified only)',
      'Custom column header mapping',
      'Zero manual CSV export required',
    ],
    setupSteps: [
      'Create a new Google Sheet (e.g. "WhatsApp Leads")',
      'Deploy our provided 10-line Apps Script Web App on the Sheet',
      'Paste the deployment Webhook URL into NX CRM Settings → Google Sheets',
      'Send a test lead to confirm instant row insertion',
    ],
    securityInfo: 'Data is transmitted over encrypted HTTPS directly to your own Google Apps Script endpoint.',
  },
  {
    slug: 'zoho',
    name: 'Zoho Mail & Zoho CRM',
    category: 'crm',
    categoryLabel: 'CRM & Email',
    status: 'Available',
    iconName: 'Mail',
    tagline: 'Connect Zoho Mail SMTP and Zoho CRM lead webhooks.',
    description: 'Sync high-priority WhatsApp leads with Zoho CRM and send automated email notifications via Zoho Mail.',
    whatItDoes: 'Routes qualified WhatsApp opportunities into your Zoho CRM ecosystem and dispatches sales notifications through Zoho Mail.',
    howItWorks: 'Enter your Zoho SMTP credentials or Zoho CRM webhook endpoint in the integrations tab to bridge conversations with Zoho.',
    keyFeatures: [
      'Zoho Mail SMTP server connection for lead alerts',
      'Zoho CRM webhook payload forwarding',
      'Lead status synchronization',
      'Multi-department alert routing',
    ],
    setupSteps: [
      'Generate a Zoho App Password from Zoho Accounts > Security',
      'Navigate to NX CRM Settings → Integrations → Zoho',
      'Enter your Zoho SMTP settings (smtppro.zoho.com / 465)',
      'Configure alert recipient emails',
    ],
    securityInfo: 'Zoho app passwords are encrypted with AES-256-GCM. Outbound SMTP uses TLS.',
  },
  {
    slug: 'razorpay',
    name: 'Razorpay Payments',
    category: 'payments',
    categoryLabel: 'Payments',
    status: 'Available',
    badge: 'Instant UPI',
    iconName: 'CreditCard',
    tagline: 'In-chat dynamic payment links and subscription billing.',
    description: 'Generate dynamic Razorpay payment links and UPI QR codes inside WhatsApp chat and power monthly SaaS subscriptions.',
    whatItDoes: 'Allows agents and automated flows to generate payment links for orders and powers the official NX CRM subscription tier upgrades.',
    howItWorks: 'Uses official Razorpay SDK with HMAC-SHA256 signature verification for server-side payment confirmation and instant entitlement.',
    keyFeatures: [
      'Instant UPI, Card & Netbanking link generation in chat',
      'Automatic payment success webhooks',
      'Real-time subscription upgrade verification',
      'Zero fake payment confirmation — strictly server verified',
    ],
    setupSteps: [
      'Enter Razorpay Key ID and Secret in workspace settings',
      'Configure default currency (INR)',
      'Use payment nodes in Visual Flow Builder or manual inbox link generator',
    ],
    securityInfo: 'Strict HMAC-SHA256 signature verification. Key secrets are never exposed to frontend client code.',
  },
  {
    slug: 'zapier-webhooks',
    name: 'Zapier & REST Webhooks',
    category: 'developer',
    categoryLabel: 'Developer & Webhooks',
    status: 'Available',
    badge: 'Universal',
    iconName: 'Webhook',
    tagline: 'Connect 5,000+ apps via outbound JSON webhooks.',
    description: 'Broadcast real-time CRM events (new contact, message received, flow executed) to Zapier, Make, or your custom REST backend.',
    whatItDoes: 'Enables custom integrations by pushing structured JSON event payloads to any destination URL upon CRM events.',
    howItWorks: 'Register webhook endpoints with custom header secrets and subscribed event topics in workspace settings.',
    keyFeatures: [
      'Custom webhook endpoint registration',
      'Event filtering (messages, contacts, deals, flows)',
      'Payload HMAC header signing',
      'Delivery retry and execution logging',
    ],
    setupSteps: [
      'Create a Webhook Catch trigger in Zapier or Make.com',
      'Enter the destination URL in NX CRM Settings → Webhooks',
      'Select subscribed events and save',
    ],
    securityInfo: 'Payloads are signed with a shared secret token for endpoint authenticity verification.',
  },
];
