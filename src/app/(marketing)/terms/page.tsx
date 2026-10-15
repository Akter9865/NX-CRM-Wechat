import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { FileText, Shield, AlertTriangle, CheckCircle2, Lock, Scale } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — NX CRM SaaS Agreement & Compliance',
  description:
    'Read the official Terms of Service, Meta WhatsApp Cloud API compliance rules, and Master Services Agreement for NX CRM, operated by Nexora Spark Agency.',
};

export default function TermsPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <Scale className="size-3.5 text-emerald-600" />
            <span>Master Service Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
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
        <div className="space-y-10 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">1</span>
              Agreement to Terms
            </h2>
            <p>
              By creating an account, accessing, or using the <strong>NX CRM</strong> platform, websites, and APIs operated by <strong>{siteConfig.legalCompanyName}</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a business, company, or other legal entity, you represent that you possess the authority to bind such entity to these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">2</span>
              Account Registration, Multi-Tenant Workspaces & Security
            </h2>
            <p>
              To access the Service, you must register for a workspace account with accurate, complete, and current information. Each workspace operates in strict multi-tenant database isolation powered by Supabase Row Level Security (RLS). You are strictly responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your workspace login credentials and API keys.</li>
              <li>All activities, broadcasts, and automated communications sent under your workspace.</li>
              <li>Immediately notifying us at <a href={`mailto:${siteConfig.securityEmail}`} className="text-emerald-700 underline font-semibold">{siteConfig.securityEmail}</a> of any unauthorized access, credential breach, or compromised webhook endpoints.</li>
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600 shrink-0" />
              <span>3. WhatsApp Cloud API Compliance & Anti-Spam Policy</span>
            </h2>
            <p className="text-slate-700">
              NX CRM integrates with Meta Platforms, Inc.&apos;s official WhatsApp Business Cloud API (Graph API v22.0). All messaging must strictly adhere to the following policies:
            </p>
            <div className="space-y-2 pt-1 text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Explicit Opt-in Consent:</strong> You must receive prior affirmative opt-in consent from individuals before messaging them via WhatsApp. Cold unsolicited spam is strictly prohibited.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>24-Hour Customer Care Window:</strong> Outside the 24-hour customer window, free-form messages are disallowed by Meta and you must use approved Meta Message Templates.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Opt-out Keyword Compliance:</strong> NX CRM automatically processes opt-out keywords (such as &quot;STOP&quot;, &quot;UNSUBSCRIBE&quot;, &quot;CANCEL&quot;, &quot;OPTOUT&quot;). You agree never to bypass, tamper with, or override a recipient&apos;s opt-out status.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Account Quality & Suspension:</strong> If Meta flags your WhatsApp Business Account (WABA) for spam or policy violations, NX CRM is not responsible for phone number tier drops, bans, or account blocks imposed directly by Meta.</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">4</span>
              AI Agents & Bring-Your-Own-Key (BYO-Key) Disclaimers
            </h2>
            <p>
              When utilizing AI Agents, Auto-Reply Bots, or inbox draft generators powered by Google Gemini, OpenAI, or Anthropic:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your API credentials are stored encrypted at rest using AES-256-GCM algorithms.</li>
              <li>You are solely responsible for configuring the business context, instructions, and prompt boundaries of your AI agents.</li>
              <li>AI-generated text may occasionally contain inaccuracies. Your agents and administrators should review drafts where appropriate. NX CRM is not liable for customer decisions based on AI-generated replies.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">5</span>
              Subscriptions, Invoicing & Razorpay Billing
            </h2>
            <p>
              Paid plans are billed on a recurring monthly subscription cycle through Razorpay in Indian Rupees (₹). Plan entitlements (contact capacity, WhatsApp connections, visual automations) activate immediately upon successful server-side payment verification. All subscriptions renew automatically unless cancelled prior to the subsequent billing anniversary.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">6</span>
              Cancellation & Refunds
            </h2>
            <p>
              You may cancel your recurring subscription at any time directly from the <strong>Billing & Plans</strong> dashboard. Cancellation takes effect at the conclusion of the active prepaid cycle. Please consult our{' '}
              <Link href="/refund-policy" className="text-emerald-700 font-semibold underline">
                Cancellation & Refund Policy
              </Link>{' '}
              for comprehensive terms on billing disputes, duplicate charges, and refund eligibility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">7</span>
              Customer Data Ownership & Intellectual Property
            </h2>
            <p>
              <strong>You retain 100% exclusive ownership</strong> of all customer phone numbers, contact records, tags, message transcripts, and knowledge-base documents entered into your workspace. {siteConfig.legalCompanyName} never sells or shares your customer data with advertisers or third parties. {siteConfig.legalCompanyName} owns all intellectual property, design assets, and source code of the NX CRM platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">8</span>
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted under applicable law, {siteConfig.legalCompanyName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, profits, data, or business opportunities arising from platform downtime, Meta API service interruptions, or third-party gateway downtime.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">9</span>
              Governing Law & Legal Jurisdiction
            </h2>
            <p>
              These Terms of Service and any associated contractual disputes shall be governed by and construed in accordance with the laws of <strong>India</strong>, under the exclusive jurisdiction of the competent courts in <strong>{siteConfig.jurisdiction}</strong>.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-900">10. Contacting Legal & Compliance</h2>
            <p>
              For formal legal notices, questions about these Terms, or enterprise data protection agreements, please contact:
            </p>
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <p><strong>Entity:</strong> {siteConfig.legalCompanyName} ({siteConfig.brand})</p>
              <p><strong>Address:</strong> {siteConfig.businessAddress}</p>
              <p><strong>Email:</strong> <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-700 underline font-semibold">{siteConfig.supportEmail}</a></p>
              <p><strong>Phone:</strong> <a href={`tel:${siteConfig.phone}`} className="text-emerald-700 underline font-semibold">{siteConfig.phone}</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
