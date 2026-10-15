import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { ShieldCheck, Lock, Database, EyeOff, Server, FileText } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — NX CRM Data Protection & Multi-Tenant Security',
  description:
    'Learn how NX CRM, operated by Nexora Spark Agency, safeguards your WhatsApp conversations, contact lists, AI keys, and payments with strict Row Level Security (RLS) and AES-256 encryption.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Privacy & Data Protection Compliance</span>
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
        <div className="space-y-9 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Commitment to Privacy</h2>
            <p>
              <strong>{siteConfig.legalCompanyName}</strong> (&quot;NX CRM&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides an enterprise multi-tenant WhatsApp CRM, Shared Inbox, and Visual Automation SaaS platform. We are deeply committed to protecting your organizational privacy, customer phone records, and communication transcripts in strict compliance with the Digital Personal Data Protection Act, 2023 (DPDP, India), GDPR, and Meta&apos;s Platform Data Policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Categories of Information Collected</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-xs">A. Account & Profile Data</h3>
                <p className="text-[11px] text-slate-500">
                  Business name, work email address, contact telephone, workspace avatar, and encrypted authentication tokens.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-xs">B. CRM Contacts & Leads</h3>
                <p className="text-[11px] text-slate-500">
                  Customer phone numbers (E.164 standard), names, lifecycle stages, deal values, conversation notes, and tags you input.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-xs">C. WhatsApp Cloud API Tokens</h3>
                <p className="text-[11px] text-slate-500">
                  Meta Phone Number ID, WhatsApp Business Account ID (WABA ID), and System User Tokens. Stored strictly with AES-256-GCM encryption.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <h3 className="font-bold text-slate-900 text-xs">D. Payment & Subscription Data</h3>
                <p className="text-[11px] text-slate-500">
                  Subscription IDs, invoice history, and transaction statuses via Razorpay. We never store raw debit/credit card numbers or UPI PINs.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Multi-Tenant Isolation & Zero Data Leakage</h2>
            <p>
              NX CRM employs strict architectural multi-tenancy. Every database query, contact query, and message stream is scoped by a mandatory <code>account_id</code>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Row Level Security (RLS):</strong> Enforced at the PostgreSQL engine level in Supabase. User A cannot view, query, or mutate records belonging to User B under any circumstance.</li>
              <li><strong>Encrypted API Keys:</strong> Third-party provider keys (OpenAI, Gemini, Anthropic, Meta App Secrets) are stored encrypted at rest. Plaintext keys are never echoed back to the browser.</li>
              <li><strong>No Cross-Training:</strong> Your customer conversations and knowledge base documents are never used to train global AI models or shared with competing businesses.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Processing of WhatsApp Messaging Payloads</h2>
            <p>
              Inbound and outbound messages are routed directly through Meta&apos;s Graph API v22.0. NX CRM processes messaging payloads solely for delivering CRM inbox functionality, automated keyword triggers, and reporting. We do not sell your contact lists, scrape address books, or inject advertising into customer conversations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Automated Opt-Out Compliance (Anti-Spam)</h2>
            <p>
              In compliance with global anti-spam mandates and Meta&apos;s Business Messaging Policies, NX CRM automatically recognizes unsubscribe keywords (such as &quot;STOP&quot;, &quot;UNSUBSCRIBE&quot;, &quot;OPTOUT&quot;, &quot;CANCEL&quot;). When detected, the contact is automatically marked as opted-out (<code>is_opted_out = true</code>), and automated sequences/broadcasts are immediately barred from messaging them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Data Retention & Deletion Rights</h2>
            <p>
              You maintain full control over your customer records. You may export your entire contact database in standard CSV format at any time from the Contacts dashboard. If you cancel your workspace and request complete erasure, all messages, contacts, and configurations are permanently deleted from our active database within thirty (30) days.
            </p>
            <p>
              To submit a formal deletion request, visit our{' '}
              <Link href="/data-deletion" className="text-emerald-700 font-semibold underline">
                Data Deletion Request Page
              </Link>{' '}
              or email{' '}
              <a href={`mailto:${siteConfig.privacyEmail}`} className="text-emerald-700 font-semibold underline">
                {siteConfig.privacyEmail}
              </a>.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-900">7. Data Protection Officer (DPO) Contact</h2>
            <p>
              For privacy audits, compliance verification, or questions regarding personal data processing:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-slate-700">
              <p><strong>Entity:</strong> {siteConfig.legalCompanyName} (NX CRM)</p>
              <p><strong>Attn:</strong> Data Protection & Security Compliance Office</p>
              <p><strong>Address:</strong> {siteConfig.businessAddress}</p>
              <p><strong>Email:</strong> <a href={`mailto:${siteConfig.privacyEmail}`} className="text-emerald-700 underline font-semibold">{siteConfig.privacyEmail}</a></p>
              <p><strong>Telephone:</strong> <a href={`tel:${siteConfig.phone}`} className="text-emerald-700 underline font-semibold">{siteConfig.phone}</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
