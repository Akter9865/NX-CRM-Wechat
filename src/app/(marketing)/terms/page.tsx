import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms & Conditions — NX CRM SaaS Service Agreement',
  description:
    'Read the official Terms & Conditions and Master Services Agreement for NX CRM, powered by Nexora Spark Agency.',
};

export default function TermsPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <FileText className="size-3.5 text-emerald-600" />
            <span>Master Service Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms & Conditions
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
            <h2 className="text-lg font-bold text-slate-900">1. Agreement to Terms</h2>
            <p>
              By accessing or using the NX CRM platform, websites, and APIs operated by {siteConfig.legalCompanyName} (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you agree to be bound by these Terms & Conditions. If you do not agree to these terms, do not create an account or use our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Account Registration & Workspace Security</h2>
            <p>
              You must provide accurate, current, and complete registration information. You are responsible for safeguarding your login credentials and for all activities that occur under your workspace account. You must notify us immediately of any unauthorized use or security compromise.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. WhatsApp & Third-Party Platform Policies</h2>
            <p>
              NX CRM integrates with Meta’s WhatsApp Business Cloud API. You acknowledge and agree that your use of WhatsApp messaging must strictly adhere to{' '}
              <span className="text-white font-medium">Meta’s WhatsApp Business Messaging Policy</span> and{' '}
              <span className="text-white font-medium">Commerce Policy</span>. You are strictly prohibited from sending unsolicited bulk spam, deceptive communications, or content that violates Meta policies. NX CRM is not liable for account suspensions imposed directly by Meta due to policy violations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Subscriptions, Invoicing & Razorpay Billing</h2>
            <p>
              Paid plans are billed on a recurring monthly cycle through Razorpay in Indian Rupees (₹). Plan entitlements (contact capacity, connection limits, automations) activate immediately upon server verification of the payment transaction. All subscriptions renew automatically unless cancelled prior to the next billing date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Cancellation & Refunds</h2>
            <p>
              You may cancel your paid subscription at any time from your Billing settings. Cancellation takes effect at the end of the current paid billing cycle. Please review our{' '}
              <Link href="/refund-policy" className="text-emerald-700 font-semibold underline">
                Refund Policy
              </Link>{' '}
              for details regarding duplicate transactions and billing dispute resolution.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Intellectual Property & Customer Data Ownership</h2>
            <p>
              You retain 100% ownership and intellectual property rights in your customer database, CRM records, and message content. {siteConfig.legalCompanyName} owns all right, title, and interest in the NX CRM software, brand marks, and underlying platform architecture.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall {siteConfig.legalCompanyName} be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill, use, or data, arising out of or relating to the use of NX CRM.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">8. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these Terms shall be subject to the exclusive jurisdiction of the competent courts in {siteConfig.jurisdiction}.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">9. Contact Details</h2>
            <p>
              For legal notices or questions regarding these Terms, please email{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-700 font-semibold underline">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
