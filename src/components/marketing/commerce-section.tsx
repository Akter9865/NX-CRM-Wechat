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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const COMMERCE_USE_CASES = [
  {
    title: 'Product Inquiries',
    desc: 'Send rich media product cards and answer sizing/spec questions instantly.',
    icon: ShoppingBag,
  },
  {
    title: 'Instant Payment Links (UPI / Cards)',
    desc: 'Generate dynamic Razorpay & PhonePe links directly in WhatsApp conversations.',
    icon: CreditCard,
  },
  {
    title: 'Order Confirmations',
    desc: 'Automatically trigger verified WhatsApp templates when order status changes.',
    icon: CheckCircle2,
  },
  {
    title: 'Delivery & Tracking Updates',
    desc: 'Send real-time dispatch and tracking links to reduce customer support tickets.',
    icon: Truck,
  },
];

export function CommerceSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Supplied Visual */}
          <div className="order-2 lg:order-1 relative">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-xl">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/15 to-teal-500/15 blur-xl -z-10" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src="/images/marketing/commerce-order.png"
                  alt="WhatsApp E-Commerce Order Confirmation and Delivery Journey"
                  width={600}
                  height={500}
                  className="w-full h-auto object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Right: Copy & Use Cases */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <ShoppingBag className="size-3.5 text-emerald-600" />
              <span>Conversational Commerce</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Turn WhatsApp Into a{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                Customer Journey
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Enable customers to browse products, confirm orders, receive payment links with UPI/QR codes, and get instant shipping updates without leaving WhatsApp.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {COMMERCE_USE_CASES.map((useCase, idx) => {
                const Icon = useCase.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mt-0.5">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{useCase.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{useCase.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <Link href="/features/whatsapp-commerce">
                <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 shadow-md shadow-emerald-600/20 flex items-center gap-2">
                  <span>Explore WhatsApp Commerce</span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
