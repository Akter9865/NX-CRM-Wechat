/**
 * Centralized Site and Organization Configuration for NX CRM.
 * Single source of truth for branding, URLs, legal company entities, and contact channels.
 * Powered by Nexora Spark Agency.
 */

export const siteConfig = {
  name: 'NX CRM',
  tagline: 'WhatsApp CRM, Automation & AI for Growing Businesses',
  description:
    'Manage WhatsApp conversations, contacts, visual automations, AI agents, and multi-agent team workflows in one powerful CRM.',
  brand: 'NX CRM',
  parentCompany: 'Nexora Spark Agency',
  companyName: 'NX CRM',
  legalCompanyName: 'Nexora Spark Agency',
  businessAddress: 'Sripur Bazar, Balagarh, West Bengal 712514, India',
  jurisdiction: 'West Bengal, India',
  phone: '+91 8653678794',
  effectiveDate: 'January 1, 2026',
  supportEmail: 'nexorasparkagencyofficial@gmail.com',
  salesEmail: 'nexorasparkagencyofficial@gmail.com',
  privacyEmail: 'nexorasparkagencyofficial@gmail.com',
  billingEmail: 'nexorasparkagencyofficial@gmail.com',
  securityEmail: 'nexorasparkagencyofficial@gmail.com',
  websiteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://nxcrm.online',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://nxcrm.online',
  social: {
    instagram: 'https://instagram.com/nexorasparkagency',
    linkedin: 'https://linkedin.com/company/nexorasparkagency',
    twitter: 'https://x.com/nexoraspark',
    youtube: 'https://youtube.com/@nexorasparkagency',
  },
  links: {
    github: 'https://github.com/Akter9865/NX-CRM-Wechat',
    docs: '/docs',
    pricing: '/pricing',
    features: '/features',
    integrations: '/integrations',
    login: '/login',
    signup: '/signup',
    contact: '/contact',
    support: '/support',
    faq: '/faq',
    privacy: '/privacy-policy',
    terms: '/terms',
    refund: '/refund-policy',
    cookie: '/cookie-policy',
    security: '/security',
    acceptableUse: '/acceptable-use',
    dataDeletion: '/data-deletion',
  },
} as const;

export type SiteConfig = typeof siteConfig;
