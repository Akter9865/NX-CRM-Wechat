'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import {
  Mail,
  PhoneCall,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactPageInner />
    </Suspense>
  );
}

function ContactPageInner() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('dept') || 'sales';

  const [category, setCategory] = useState<string>(
    ['sales', 'support', 'billing', 'technical'].includes(initialCategory)
      ? initialCategory
      : 'sales'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dept = searchParams.get('dept');
    if (dept && ['sales', 'support', 'billing', 'technical'].includes(dept)) {
      setCategory(dept);
    }
  }, [searchParams]);

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
          company,
          subject,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit message.');
      }

      setSubmitted(true);
      setInquiryId(data.inquiryId);
      toast.success('Your message has been received!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending message.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <MessageSquare className="size-3.5 text-emerald-600" />
            <span>Official Communication</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Get in Touch With{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Our Team
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Have questions about WhatsApp Cloud API pricing, technical integrations, or custom enterprise deployments? We’re here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Column */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-7 space-y-6">
              <h3 className="text-base font-bold text-slate-900">Department Channels</h3>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
                    <PhoneCall className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Direct Phone / WhatsApp</h4>
                    <a href={`tel:${siteConfig.phone}`} className="text-slate-600 hover:text-emerald-700 font-semibold mt-0.5 block">
                      {siteConfig.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Official Email</h4>
                    <a href={`mailto:${siteConfig.supportEmail}`} className="text-slate-600 hover:text-blue-700 font-semibold mt-0.5 block">
                      {siteConfig.supportEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 border border-purple-200 text-purple-600 shrink-0">
                    <Building className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Nexora Spark Agency</h4>
                    <p className="text-slate-500 mt-0.5">Parent Operating Company</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex items-start gap-2.5 text-slate-600">
                  <MapPin className="size-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>{siteConfig.businessAddress}</span>
                </div>
                <div className="text-[11px] text-slate-500 pl-6">
                  Jurisdiction: {siteConfig.jurisdiction}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form Column */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl">
              {submitted ? (
                <div className="text-center py-10 space-y-6 animate-in fade-in-50 duration-300">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-md">
                    <CheckCircle2 className="size-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">Message Received!</h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Thank you for contacting NX CRM. Your inquiry reference ID is{' '}
                      <span className="font-mono font-bold text-emerald-700">{inquiryId}</span>.
                      Our dedicated specialist will review your request and reply to{' '}
                      <span className="font-semibold text-slate-900">{email}</span> within 24 business hours.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setSubject('');
                      setMessage('');
                    }}
                    variant="outline"
                    className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selector Tabs */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Inquiry Category
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'sales', label: 'Sales & Demo' },
                        { id: 'support', label: 'Tech Support' },
                        { id: 'billing', label: 'Billing / Plans' },
                        { id: 'technical', label: 'API & Dev' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCategory(tab.id)}
                          className={cn(
                            'py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center',
                            category === tab.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                      <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                        Your Full Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                        Work Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Company & Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-xs font-semibold text-slate-700">
                        Company Name (Optional)
                      </Label>
                      <Input
                        id="company"
                        type="text"
                        placeholder="Acme Inc."
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="subject" className="text-xs font-semibold text-slate-700">
                        Subject *
                      </Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="e.g. Enterprise WhatsApp API Setup"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-xs font-semibold text-slate-700">
                      Message Details *
                    </Label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder="Please share details about your team size, expected monthly WhatsApp message volume, or specific questions..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-emerald-500 leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Submitting Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Inquiry</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
