import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  CreditCard,
  Truck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'WhatsApp Commerce & Order Journeys — In-Chat Sales & Payments',
  description:
    'Turn WhatsApp conversations into storefronts. Share product cards, generate dynamic Razorpay/PhonePe payment links, and send instant order delivery updates.',
};

export default function WhatsAppCommerceFeaturePage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/features" className="hover:text-slate-900">Features</Link>
          <span>/</span>
          <span className="text-emerald-700 font-bold">WhatsApp Commerce</span>
        </div>

        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <ShoppingBag className="size-3.5 text-emerald-600" />
              <span>Conversational Commerce</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Sell Directly Inside{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                WhatsApp Chats
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Enable your customers to complete purchases without switching between apps. Send product catalogs, generate instant UPI payment links, and provide real-time shipping tracking.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/signup">
                <Button className="h-12 px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2">
                  <span>Start Selling on WhatsApp</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl">
              <Image
                src="/images/marketing/whatsapp-store.png"
                alt="WhatsApp Store and Instant Payment Collection"
                width={600}
                height={480}
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CreditCard className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instant UPI & Card Links</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate dynamic Razorpay and PhonePe links directly in the inbox. Customers pay via GPay, PhonePe, Paytm, or Credit Card in seconds.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Truck className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Order & Tracking Notifications</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dispatch automated WhatsApp notifications when orders are confirmed, dispatched, out for delivery, and successfully received.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-4 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Zap className="size-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Abandoned Cart Recovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Re-engage prospects who inquired about products but didn&apos;t complete payment with personalized follow-up sequences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
