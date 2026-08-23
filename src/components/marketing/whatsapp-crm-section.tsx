import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  CheckCircle2,
  Tag,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Users2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WhatsAppCrmSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Visual Artwork */}
          <div className="order-2 lg:order-1 relative">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-xl">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-emerald-500/15 to-blue-500/15 blur-xl -z-10" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src="/images/marketing/hero-showcase.png"
                  alt="WhatsApp CRM Conversations and Broadcast interface"
                  width={650}
                  height={500}
                  className="w-full h-auto object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Copy & Feature Points */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <MessageSquare className="size-3.5" />
              <span>Official Cloud API</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Your WhatsApp Conversations,{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Organized Like a CRM
              </span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Transform unstructured WhatsApp chats into structured customer relationship records. Track every interaction, assign conversations to teammates, apply tags, manage verified message templates, and monitor message delivery statuses in real-time.
            </p>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">WhatsApp Cloud API</h4>
                  <p className="text-[11px] text-slate-500">Direct Meta BSP connection with no markup fees.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <Tag className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Custom Tags & Notes</h4>
                  <p className="text-[11px] text-slate-500">Tag leads by interest and write private team notes.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <Users2 className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Agent Assignment</h4>
                  <p className="text-[11px] text-slate-500">Auto-route or manually delegate chats to team members.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <Send className="size-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Delivery Receipts</h4>
                  <p className="text-[11px] text-slate-500">Real-time Sent, Delivered, and Read checkmarks.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/features/whatsapp-crm">
                <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 shadow-md shadow-emerald-600/20 flex items-center gap-2">
                  <span>Explore WhatsApp CRM</span>
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
