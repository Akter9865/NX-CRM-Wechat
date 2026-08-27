'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import {
  PhoneCall,
  Mail,
  MapPin,
  Building2,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Headphones,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ContactSection() {
  const [category, setCategory] = useState<string>('sales');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM Team! I am interested in WhatsApp Cloud API CRM, visual automations & pricing for my business.'
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          name,
          email,
          company: company ? `${company} (WhatsApp: ${whatsappPhone || 'N/A'})` : `WhatsApp: ${whatsappPhone || 'N/A'}`,
          subject: `Quick Inquiry (${category.toUpperCase()}): ${name}`,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      setSubmitted(true);
      setInquiryId(data.inquiryId);
      toast.success('Your message has been received! Our team will reach out promptly.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting message.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative py-20 md:py-28 bg-white border-t border-slate-200/80 overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[750px] h-[400px] bg-emerald-50/70 blur-[130px] rounded-full -z-10" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[450px] h-[350px] bg-blue-50/60 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <MessageCircle className="size-3.5 text-emerald-600" />
            <span>Direct WhatsApp & Sales Hotline</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Have Questions?{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Talk to Our Team
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Connect instantly on WhatsApp, give us a call, or send an inquiry. Our dedicated team at Nexora Spark Agency is ready to assist with onboarding, custom plans, and enterprise integrations.
          </p>
        </div>

        {/* 3 Main Direct Action Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {/* Card 1: Instant WhatsApp */}
          <a
            href={waDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white shadow-sm hover:shadow-xl hover:border-emerald-400 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 group-hover:scale-110 transition-transform">
                  <MessageCircle className="size-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  ⚡ &lt; 15 min reply
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-emerald-700 transition-colors">
                Chat on WhatsApp
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Message our specialists directly for quick product demos, pricing discussions, or technical queries.
              </p>
              <div className="font-semibold text-emerald-700 text-sm flex items-center gap-1">
                <span>{siteConfig.phone}</span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-emerald-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              <span>Open WhatsApp Chat</span>
              <ArrowRight className="size-3.5" />
            </div>
          </a>

          {/* Card 2: Phone Hotline */}
          <a
            href={`tel:${siteConfig.phone}`}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25 group-hover:scale-110 transition-transform">
                  <PhoneCall className="size-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                  Direct Line
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-blue-700 transition-colors">
                Call Our Hotline
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Speak directly with an enterprise solutions expert regarding high volume broadcasts & team onboarding.
              </p>
              <div className="font-semibold text-blue-700 text-sm flex items-center gap-1">
                <span>{siteConfig.phone}</span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-blue-100 flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
              <span>Call Now</span>
              <ArrowRight className="size-3.5" />
            </div>
          </a>

          {/* Card 3: Email Support */}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl border border-purple-200 bg-gradient-to-b from-purple-50/60 to-white shadow-sm hover:shadow-xl hover:border-purple-400 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/25 group-hover:scale-110 transition-transform">
                  <Mail className="size-6" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100/80 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  24/7 Mon-Sun
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-purple-700 transition-colors">
                Official Email
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Send RFPs, custom security review questionnaires, billing receipts, or developer webhook requests.
              </p>
              <div className="font-semibold text-purple-700 text-xs sm:text-sm truncate">
                <span>{siteConfig.supportEmail}</span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-purple-100 flex items-center gap-1.5 text-xs font-bold text-purple-700 group-hover:translate-x-1 transition-transform">
              <span>Send Email</span>
              <ArrowRight className="size-3.5" />
            </div>
          </a>
        </div>

        {/* Detailed Grid: Office Details & Interactive Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Organization & Address Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm">
                  NX
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Nexora Spark Agency</h4>
                  <p className="text-[11px] text-slate-500">Official Tech & Operating Entity</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Registered Headquarters:</span>
                    <span className="text-slate-600 leading-relaxed">{siteConfig.businessAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Support Operating Hours:</span>
                    <span className="text-slate-600">Monday to Sunday (24/7 WhatsApp & Ticket Triage)</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="size-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Meta Tech Provider Compliance:</span>
                    <span className="text-slate-600">Graph API v22.0 Cloud Architecture, ISO & GDPR compliant tenant isolation</span>
                  </div>
                </div>
              </div>

              {/* Quick WhatsApp CTA Button */}
              <div className="pt-2">
                <a
                  href={waDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <MessageCircle className="size-4" />
                  <span>Start WhatsApp Conversation</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Homepage Contact Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Send an Inquiry Directly</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fill out this quick form and our WhatsApp solutions specialist will get back to you within 24 business hours.
                </p>
              </div>

              {submitted ? (
                <div className="text-center py-10 space-y-5 animate-in fade-in-50 duration-300">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-md">
                    <CheckCircle2 className="size-7" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xl font-bold text-slate-900">Inquiry Dispatched!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Reference ID: <span className="font-mono font-bold text-emerald-700">{inquiryId}</span>. We will follow up via WhatsApp and email at <span className="font-semibold text-slate-900">{email}</span>.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setMessage('');
                    }}
                    variant="outline"
                    className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Category Buttons */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Inquiry Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'sales', label: 'Sales / Demo' },
                        { id: 'onboarding', label: 'WhatsApp Setup' },
                        { id: 'technical', label: 'Tech Support' },
                        { id: 'billing', label: 'Billing / Plans' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCategory(tab.id)}
                          className={cn(
                            'py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center',
                            category === tab.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="contact-name" className="text-xs font-semibold text-slate-700">
                        Full Name *
                      </Label>
                      <Input
                        id="contact-name"
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-10 rounded-xl border-slate-200 text-xs focus-visible:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="contact-email" className="text-xs font-semibold text-slate-700">
                        Email Address *
                      </Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="rahul@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10 rounded-xl border-slate-200 text-xs focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Number & Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="contact-wa" className="text-xs font-semibold text-slate-700">
                        WhatsApp Number (Optional)
                      </Label>
                      <Input
                        id="contact-wa"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 text-xs focus-visible:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="contact-company" className="text-xs font-semibold text-slate-700">
                        Company Name (Optional)
                      </Label>
                      <Input
                        id="contact-company"
                        type="text"
                        placeholder="e.g. Acme Enterprises"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 text-xs focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1">
                    <Label htmlFor="contact-msg" className="text-xs font-semibold text-slate-700">
                      Message Details *
                    </Label>
                    <Textarea
                      id="contact-msg"
                      rows={3}
                      placeholder="Share details regarding your monthly WhatsApp message volume, desired automations, or questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 text-xs focus-visible:border-emerald-500 leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Sending Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Inquiry</span>
                        <Send className="size-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
