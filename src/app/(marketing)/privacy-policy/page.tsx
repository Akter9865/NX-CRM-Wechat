import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — NX CRM',
  description:
    'Read the official Privacy Policy for NX CRM, powered by Nexora Spark Agency. Information collection, WhatsApp data handling, security, and user rights.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Legal & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Effective Date: {siteConfig.effectiveDate}</span>
            <span>•</span>
            <span>Entity: {siteConfig.legalCompanyName}</span>
            <span>•</span>
            <span>Jurisdiction: {siteConfig.jurisdiction}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Introduction</h2>
            <p>
              {siteConfig.legalCompanyName} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the NX CRM SaaS platform located at{' '}
              <a href={siteConfig.websiteUrl} className="text-emerald-700 font-semibold underline">
                {siteConfig.websiteUrl}
              </a>
              . This Privacy Policy explains how we collect, process, store, and protect personal information when you use our website, customer relationship management software, and official WhatsApp Cloud API integration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900">Account Registration Data:</strong> When creating a workspace, we collect your full name, work email address, and encrypted credentials.
              </p>
              <p>
                <strong className="text-slate-900">Customer Relationship Data (CRM):</strong> Information you and your agents enter into NX CRM, including contact phone numbers (in international format), tags, notes, pipeline stages, and custom attributes.
              </p>
              <p>
                <strong className="text-slate-900">WhatsApp Cloud API Credentials:</strong> Meta Phone Number ID, WhatsApp Business Account ID (WABA ID), and System User Access Tokens provided to enable message routing. All access tokens are AES-256-GCM encrypted.
              </p>
              <p>
                <strong className="text-slate-900">Billing & Transaction Records:</strong> We process subscription payments through Razorpay. We do not store raw credit card numbers or banking passwords on our servers.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provision your multi-tenant workspace and manage user authentication.</li>
              <li>To route inbound and outbound WhatsApp messages via Meta Graph API v22.0.</li>
              <li>To execute automated workflow sequences, auto-replies, and AI drafts.</li>
              <li>To generate analytics metrics (response times, resolution rates, broadcast deliveries).</li>
              <li>To process subscription renewals and send transactional billing receipts.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Data Security & Storage Architecture</h2>
            <p>
              All customer data is hosted in encrypted PostgreSQL databases powered by Supabase with Row Level Security (RLS) policies enforcing complete isolation between client accounts. All data in transit is encrypted using TLS 1.3, and access tokens are encrypted at rest using industry-standard AES-256 algorithms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Meta Platform Compliance & WhatsApp Messages</h2>
            <p>
              We process WhatsApp messaging payloads exclusively for the purpose of providing CRM functionality to your authorized workspace. We do not sell customer contact lists, scrape messaging directories, or share customer data with third-party advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. User Rights & Data Deletion</h2>
            <p>
              You have the right to access, rectify, export, or permanently erase your workspace data at any time. To submit a formal data deletion request, visit our{' '}
              <Link href="/data-deletion" className="text-emerald-700 font-semibold underline">
                Data Deletion Request Page
              </Link>{' '}
              or email us at{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-700 font-semibold underline">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Contact the Privacy Officer</h2>
            <p>
              If you have any questions or concerns regarding our privacy practices, please contact:
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1 text-xs">
              <p className="font-bold text-slate-900">{siteConfig.legalCompanyName}</p>
              <p>Attn: Privacy & Data Protection Compliance</p>
              <p>Email: {siteConfig.supportEmail}</p>
              <p>Address: {siteConfig.businessAddress}</p>
              <p>Jurisdiction: {siteConfig.jurisdiction}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
