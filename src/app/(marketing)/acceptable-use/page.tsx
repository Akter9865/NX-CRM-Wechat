import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { AlertOctagon, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Acceptable Use Policy (AUP) — NX CRM',
  description:
    'Rules and prohibitions governing the use of NX CRM: Anti-spam, phishing prevention, WhatsApp Business policy compliance, and anti-abuse standards.',
};

export default function AcceptableUsePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-semibold text-rose-800">
            <AlertOctagon className="size-3.5 text-rose-600" />
            <span>Platform Guidelines</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Acceptable Use Policy (AUP)
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Effective Date: {siteConfig.effectiveDate}</span>
            <span>•</span>
            <span>Entity: {siteConfig.legalCompanyName}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Purpose & Scope</h2>
            <p>
              This Acceptable Use Policy defines prohibited activities when using NX CRM software, APIs, and integrated communication channels. We maintain zero tolerance for spam, fraudulent operations, and abusive messaging.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Prohibited Messaging & Activities</h2>
            <div className="space-y-2">
              <p>
                <strong className="text-slate-900">Unsolicited Spam:</strong> You may not send bulk unsolicited promotional messages to phone numbers without obtaining explicit opt-in consent pursuant to Meta WhatsApp Business policies and regional telecommunication laws.
              </p>
              <p>
                <strong className="text-slate-900">Phishing, Scams & Fraud:</strong> Using NX CRM to impersonate banks, financial institutions, government agencies, or deceive individuals regarding payments, lottery winnings, or credentials is strictly prohibited.
              </p>
              <p>
                <strong className="text-slate-900">Illegal, Harassing, or Harmful Content:</strong> Transmitting threats, hate speech, illegal drug commerce, copyright infringement, or defamatory content is grounds for immediate permanent termination.
              </p>
              <p>
                <strong className="text-slate-900">Abusive Rate Limiting & Denial of Service:</strong> Attempting to overwhelm our webhooks, reverse-engineer proprietary components, scan for vulnerabilities, or bypass plan quota limits without authorization.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. WhatsApp Platform Rules Enforcement</h2>
            <p>
              Your use of WhatsApp Cloud API is subject to Meta’s Business Messaging Policy. If Meta flags your WhatsApp Business Account (WABA) for spam or excessive user blocking, your account may be restricted by Meta. NX CRM reserves the right to suspend accounts actively violating these policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Violations & Account Termination</h2>
            <p>
              Failure to comply with this Acceptable Use Policy constitutes a material breach of the Terms of Service and may result in immediate suspension or termination of your NX CRM workspace without entitlement to a refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Reporting Abuse</h2>
            <p>
              To report abusive messaging or suspected policy violations originating from an NX CRM workspace, please email{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-rose-700 font-semibold underline">
                {siteConfig.supportEmail}
              </a>{' '}
              with evidence and message timestamps.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
