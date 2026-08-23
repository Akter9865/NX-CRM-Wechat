import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { CreditCard } from 'lucide-react';

export const metadata = {
  title: 'Refund & Cancellation Policy — NX CRM',
  description:
    'Official Refund and Cancellation Policy for NX CRM Razorpay subscription billing. Rules for cancellations, renewals, duplicate transactions, and disputes.',
};

export default function RefundPolicyPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-xs font-semibold text-purple-800">
            <CreditCard className="size-3.5 text-purple-600" />
            <span>Billing & Payments</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Effective Date: {siteConfig.effectiveDate}</span>
            <span>•</span>
            <span>Entity: {siteConfig.legalCompanyName}</span>
            <span>•</span>
            <span>Payment Gateway: Razorpay</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Subscription Cancellation</h2>
            <p>
              You may cancel your NX CRM paid subscription at any time directly through your workspace dashboard under the Billing tab. When you cancel:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Your subscription will not renew at the next billing date.</li>
              <li>You will continue to have full access to your plan entitlements until the end of your current monthly billing period.</li>
              <li>No cancellation fees or penalties apply.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Refund Eligibility</h2>
            <p>
              Because NX CRM offers a fully functional ₹0 Free Tier to test and evaluate the software before upgrading, monthly subscription fees are generally non-refundable once the billing cycle commences. However, refunds are granted under the following specific verified conditions:
            </p>
            <div className="space-y-2 pt-1">
              <p>
                <strong className="text-slate-900">Duplicate Payments:</strong> In the event that a technical glitch or network error results in duplicate charges for the same subscription period, the duplicated transaction will be refunded in full.
              </p>
              <p>
                <strong className="text-slate-900">Payment Debited but Not Credited / Activated:</strong> If funds were deducted from your bank account or card via Razorpay, but our server verification was unable to activate your workspace entitlement due to a gateway timeout, we will promptly reconcile and activate your plan or issue a full refund upon verification.
              </p>
              <p>
                <strong className="text-slate-900">Accidental Plan Upgrade:</strong> If you accidentally upgraded to an incorrect tier and notify our billing department within 48 hours without exceeding free tier messaging thresholds, a prorated refund or tier adjustment may be processed at our discretion.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Non-Refundable Items</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Fees already paid for completed monthly billing cycles.</li>
              <li>Messaging costs charged directly by Meta for WhatsApp conversation category fees.</li>
              <li>Subscriptions suspended or terminated due to violation of Meta’s WhatsApp Business Policies or our Acceptable Use Policy.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Refund Processing Timeline</h2>
            <p>
              Approved refund requests are submitted to Razorpay within 2 business days. Depending on your issuing bank and original payment method (UPI, Debit Card, Credit Card, Netbanking), the funds will reflect in your account within 5 to 7 business days pursuant to standard banking settlement schedules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. How to Request a Refund or Billing Review</h2>
            <p>
              To report a billing discrepancy or request a refund, please email{' '}
              <a href={`mailto:${siteConfig.billingEmail}`} className="text-emerald-700 font-semibold underline">
                {siteConfig.billingEmail}
              </a>{' '}
              with your Razorpay Payment ID, account email, and workspace name.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
