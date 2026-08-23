import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { Cookie } from 'lucide-react';

export const metadata = {
  title: 'Cookie Policy — NX CRM',
  description:
    'Learn how NX CRM uses essential cookies, authentication session tokens, and theme preferences to operate the platform securely.',
};

export default function CookiePolicyPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-4 pb-8 border-b border-slate-200 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-800">
            <Cookie className="size-3.5 text-amber-600" />
            <span>Browser Storage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Cookie Policy
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
            <h2 className="text-lg font-bold text-slate-900">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They are widely used to make websites function efficiently, provide secure authentication, and remember your session preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Cookies and Storage Used by NX CRM</h2>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">Strictly Essential & Authentication Cookies</h3>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">sb-*-auth-token:</strong> Supabase session authentication cookies that maintain your secure login state and rotate JWT access tokens across server requests.
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">wacrm_superadmin_session:</strong> Administrative session token for authorized super-admin portal access.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900">Preference & Theme LocalStorage</h3>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">wacrm.theme / wacrm.mode:</strong> Stores your chosen UI mode (light / dark) and custom accent color swatch so the layout renders without flash of unstyled content.
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="text-slate-900">nxcrm_announcement_dismissed_v1:</strong> Remembers when you dismiss the top product announcement bar.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Third-Party Cookies</h2>
            <p>
              When you initiate subscription checkout, the Razorpay Checkout SDK may place essential security cookies to prevent card fraud and authenticate UPI sessions. We do not use intrusive third-party cross-site advertising tracking cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Managing Your Cookie Preferences</h2>
            <p>
              You can control and disable cookies through your browser settings. Please note that disabling essential authentication cookies will prevent you from signing into your NX CRM workspace.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please email{' '}
              <a href={`mailto:${siteConfig.privacyEmail}`} className="text-emerald-700 font-semibold underline">
                {siteConfig.privacyEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
