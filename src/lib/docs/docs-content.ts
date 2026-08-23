export interface DocPage {
  slug: string;
  title: string;
  category: string;
  tagline: string;
  content: {
    overview: string;
    sections: {
      heading: string;
      body: string[];
      codeSnippet?: string;
    }[];
  };
}

export const DOC_PAGES: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started with NX CRM',
    category: 'Onboarding',
    tagline: 'Step-by-step onboarding to launch your WhatsApp CRM workspace in minutes.',
    content: {
      overview:
        'NX CRM is designed for fast, seamless workspace creation. In this guide, you will learn how to sign up, configure your workspace details, invite teammates, and understand core navigation.',
      sections: [
        {
          heading: '1. Create Your Account',
          body: [
            'Visit https://nxcrm.online/signup and enter your full name, work email address, and a secure password.',
            'Upon registration, check your email for the verification activation link. Once confirmed, you will be automatically routed to your default workspace dashboard.',
          ],
        },
        {
          heading: '2. Understanding Workspace Roles',
          body: [
            'Owner: The primary account creator who manages workspace billing, company settings, and team access.',
            'Admin: Can manage WhatsApp connections, message templates, flow automations, and agent roster.',
            'Agent: Can claim conversations, reply to customers in the shared inbox, update contact details, and manage pipeline deals.',
            'Viewer: Read-only access to view conversations and analytics without sending messages.',
          ],
        },
        {
          heading: '3. Next Steps',
          body: [
            'Proceed to the WhatsApp Setup guide to connect your official Meta Cloud API Phone Number ID.',
          ],
        },
      ],
    },
  },
  {
    slug: 'connect-whatsapp',
    title: 'Connecting Official WhatsApp Cloud API',
    category: 'WhatsApp Integration',
    tagline: 'Connect Meta WhatsApp Business API with zero third-party markups.',
    content: {
      overview:
        'NX CRM communicates directly with Meta Graph API endpoints. Follow these exact steps in your Meta for Developers Console to obtain your Phone Number ID and System User Token.',
      sections: [
        {
          heading: '1. Create Meta Developer App',
          body: [
            'Log into https://developers.facebook.com with your Facebook business credentials.',
            'Click Create App → Select "Other" → Select "Business" as the app type.',
            'Add the "WhatsApp" product to your newly created Meta app.',
          ],
        },
        {
          heading: '2. Generate Permanent System User Token',
          body: [
            'In Meta Business Suite (business.facebook.com) → Business Settings → Users → System Users.',
            'Create an Admin System User and generate a token with whatsapp_business_messaging and whatsapp_business_management permissions.',
          ],
        },
        {
          heading: '3. Enter Credentials in NX CRM',
          body: [
            'In your NX CRM dashboard, go to Settings → WhatsApp tab.',
            'Enter your Phone Number ID, WhatsApp Business Account ID (WABA ID), and System User Token.',
            'Click "Test Connection & Save" — NX CRM validates the handshake and sets up the live webhook receiver.',
          ],
        },
      ],
    },
  },
  {
    slug: 'shared-inbox',
    title: 'Using the Multi-Agent Shared Inbox',
    category: 'Core Features',
    tagline: 'Master team chat assignment, private internal notes, and 24-hour service timers.',
    content: {
      overview:
        'The NX CRM Shared Inbox brings all customer WhatsApp conversations into one collaborative desktop and mobile interface.',
      sections: [
        {
          heading: '1. Conversation Queues',
          body: [
            'Unassigned: Incoming messages that have not yet been assigned to any specific team member.',
            'Assigned to Me: All conversations where you are designated as the lead agent.',
            'All Conversations: Full audit log of all workspace customer interactions.',
          ],
        },
        {
          heading: '2. Meta 24-Hour Messaging Window',
          body: [
            'Meta allows free-form customer service messaging for 24 hours following the customer’s latest message.',
            'A live countdown timer is visible in the conversation header. When the 24h window closes, you can re-open dialogue using approved HSM Message Templates.',
          ],
        },
        {
          heading: '3. Leaving Private Internal Notes',
          body: [
            'Switch the composer mode to "Internal Note" to write private context for teammates (e.g. "Customer requested custom quote for 5,000 units").',
            'Internal notes are highlighted with an amber lock icon and are never sent to the customer.',
          ],
        },
      ],
    },
  },
  {
    slug: 'contacts',
    title: 'Managing Contacts & Tags',
    category: 'CRM & Pipeline',
    tagline: 'Organize your customer directory with custom tags, attributes, and CSV sync.',
    content: {
      overview:
        'Every person who messages your WhatsApp Business number is automatically stored as a Contact in NX CRM with phone deduplication.',
      sections: [
        {
          heading: '1. Contact Attributes',
          body: [
            'Contacts store Full Name, International Phone Number (E.164 format), Email, Tags, and Custom Attributes.',
            'Use tags like "Hot Lead", "VIP", "Enterprise", or "Support" to filter and target contacts.',
          ],
        },
        {
          heading: '2. CSV Import & Export',
          body: [
            'Navigate to Contacts tab → Click Import CSV to bulk upload lead lists.',
            'Map your spreadsheet columns to CRM fields. Existing phone numbers are automatically merged to prevent duplicates.',
          ],
        },
      ],
    },
  },
  {
    slug: 'automation',
    title: 'Visual Workflow Builder Guide',
    category: 'Automation',
    tagline: 'Construct branching automations with triggers, conditions, delays, and webhooks.',
    content: {
      overview:
        'Automate repetitive customer communication using our visual drag-and-drop flow builder without writing code.',
      sections: [
        {
          heading: '1. Triggers',
          body: [
            'Keyword Match: Triggers when inbound text contains specific phrases (e.g. "PRICING", "DEMO", "SUPPORT").',
            'Click-to-WhatsApp Ad: Triggers when a user clicks your sponsored Meta ad campaign.',
            'New Contact: Triggers automatically when a new phone number messages for the first time.',
          ],
        },
        {
          heading: '2. Conditions & Actions',
          body: [
            'If/Else Conditions: Branch flows based on contact tags, business hours, or previous interactions.',
            'Send Message: Dispatches interactive quick reply buttons, list menus, or template messages.',
            'Delay Node: Waits a specified duration (minutes or hours) before sending follow-up prompts.',
            'Assign Agent: Routes the chat to a specific team member once qualified.',
          ],
        },
      ],
    },
  },
  {
    slug: 'templates',
    title: 'WhatsApp Message Templates (HSM)',
    category: 'Messaging',
    tagline: 'Create, submit, and manage Meta-approved message templates.',
    content: {
      overview:
        'To initiate contact with a customer outside the 24-hour service window, Meta requires pre-approved Highly Structured Message (HSM) templates.',
      sections: [
        {
          heading: '1. Template Categories',
          body: [
            'Utility: Order confirmations, billing receipts, account updates, and appointment reminders.',
            'Marketing: Promotional announcements, product launches, and discount codes.',
            'Authentication: One-time passwords (OTP) and login verification codes.',
          ],
        },
        {
          heading: '2. Dynamic Variables & Quick Reply Buttons',
          body: [
            'Use {{1}}, {{2}} placeholders in template text to inject dynamic contact names, order numbers, and dates.',
            'Attach Quick Reply or Call-to-Action (URL / Phone) buttons for effortless one-tap customer responses.',
          ],
        },
      ],
    },
  },
  {
    slug: 'billing',
    title: 'Billing, Quotas & Subscriptions',
    category: 'Account & Billing',
    tagline: 'Understand Razorpay payments, contact capacity, and subscription upgrades.',
    content: {
      overview:
        'NX CRM provides transparent monthly subscription plans in Indian Rupees (INR) processed via Razorpay.',
      sections: [
        {
          heading: '1. Plan Tiers & Quotas',
          body: [
            'Free (₹0/mo): 10 contacts, 200 messages/mo, 1 WhatsApp connection, 3 flow automations.',
            'Pro (₹499/mo): 1,000 contacts, unlimited messaging*, 1 WhatsApp connection, full automations & AI.',
            'Business (₹3,000/mo): 7,000 contacts, unlimited messaging*, 5 WhatsApp connections, priority support.',
            'Enterprise (₹8,999/mo): Unlimited contacts, unlimited messaging*, unlimited WhatsApp connections, dedicated SLA.',
          ],
        },
        {
          heading: '2. Instant Activation & Cancellations',
          body: [
            'Subscriptions upgrade instantly upon Razorpay payment confirmation.',
            'You can cancel your recurring plan at any time in the Billing dashboard with zero cancellation penalties.',
          ],
        },
      ],
    },
  },
  {
    slug: 'integrations',
    title: 'Connecting External Apps & Tools',
    category: 'Integrations',
    tagline: 'Connect Google Sheets, Zoho Mail, Calendly, and Payment Gateways.',
    content: {
      overview:
        'Bridge your WhatsApp conversations with third-party software for real-time lead sync and automated payment collection.',
      sections: [
        {
          heading: '1. Google Sheets Lead Export',
          body: [
            'Deploy our provided Google Apps Script Web App on your spreadsheet and paste the Webhook URL in Settings.',
            'New leads are appended as rows in real-time with zero manual data entry.',
          ],
        },
        {
          heading: '2. Razorpay & PhonePe In-Chat Payments',
          body: [
            'Enter your Razorpay Key ID & Secret in Settings → Integrations.',
            'Generate dynamic UPI payment links directly inside chat or attach payment nodes in your visual automation flows.',
          ],
        },
      ],
    },
  },
  {
    slug: 'api',
    title: 'Public REST API & Outbound Webhooks',
    category: 'Developer Reference',
    tagline: 'Programmatic API access for message dispatch, contact CRUD, and webhook events.',
    content: {
      overview:
        'NX CRM provides a developer-friendly REST API for custom backend integrations, ERPs, and automated triggers.',
      sections: [
        {
          heading: '1. Generating API Keys',
          body: [
            'Go to Settings → API Keys tab in your dashboard.',
            'Create a scoped API key (read:contacts, write:messages, etc.) and store the secret token securely.',
          ],
        },
        {
          heading: '2. Outbound Message Dispatch',
          body: [
            'Send messages programmatically by making an authorized POST request to /api/v1/messages with your API Key header.',
          ],
          codeSnippet: `curl -X POST https://nxcrm.online/api/v1/messages \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+919876543210",
    "text": "Hello! Your appointment is confirmed for tomorrow."
  }'`,
        },
      ],
    },
  },
];
