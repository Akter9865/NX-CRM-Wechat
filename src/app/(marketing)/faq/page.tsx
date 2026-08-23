import Link from 'next/link';
import { FaqSection } from '@/components/marketing/faq-section';
import { HelpCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Frequently Asked Questions — NX CRM Help & Policies',
  description:
    'Clear answers to common questions about NX CRM, WhatsApp Cloud API connection, team inboxes, automated flows, Razorpay billing, and GDPR compliance.',
};

export default function DedicatedFaqPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FaqSection />

        {/* Still have questions banner */}
        <div className="mt-16 text-center max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-8 sm:p-10 space-y-4 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto">
            <Mail className="size-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Still have questions?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our technical support and sales teams are available to assist with any custom architecture or high-volume setup.
          </p>
          <div className="pt-2">
            <Link href="/contact">
              <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md">
                Contact Our Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
