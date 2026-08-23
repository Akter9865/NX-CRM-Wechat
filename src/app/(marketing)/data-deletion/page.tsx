'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import {
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function DataDeletionPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestCode, setRequestCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          workspace,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit deletion request.');
      }

      setRequestCode(data.requestCode);
      setSubmitted(true);
      toast.success('Data deletion request submitted successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while submitting.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-semibold text-rose-800">
            <Trash2 className="size-3.5 text-rose-600" />
            <span>GDPR & DPDP Compliance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Account & Data{' '}
            <span className="bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
              Deletion Request
            </span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            Under GDPR, Indian DPDP Act, and applicable data privacy regulations, you have the right to request the permanent erasure of your account, workspace data, and contact records.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl">
          {submitted ? (
            <div className="text-center py-8 space-y-6 animate-in fade-in-50 duration-300">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-md">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-slate-900">Deletion Request Formally Logged</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your formal data deletion request has been recorded with reference code:{' '}
                  <span className="font-mono font-bold text-rose-700 block sm:inline mt-1 sm:mt-0 text-sm">
                    {requestCode}
                  </span>
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Our privacy compliance officer will review your request, verify workspace ownership via{' '}
                  <span className="font-semibold text-slate-900">{email}</span>, and complete permanent data purging within 30 days.
                </p>
              </div>

              <Link href="/">
                <Button variant="outline" className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-amber-950">Permanent Action: </strong>
                  Deleting your workspace will permanently erase your contact records, conversation histories, visual automations, and unlinked WhatsApp connections. This action cannot be reversed once processed.
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-rose-500"
                />
              </div>

              {/* Account Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Account / Workspace Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-rose-500"
                />
              </div>

              {/* Workspace Name */}
              <div className="space-y-1.5">
                <Label htmlFor="workspace" className="text-xs font-semibold text-slate-700">
                  Workspace Name / Account ID (Optional)
                </Label>
                <Input
                  id="workspace"
                  type="text"
                  placeholder="Acme Workspace"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-rose-500"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-semibold text-slate-700">
                  Reason for Deletion (Optional)
                </Label>
                <Textarea
                  id="reason"
                  rows={3}
                  placeholder="Help us understand why you are leaving (e.g. business closure, testing completed)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-slate-900 text-xs focus-visible:border-rose-500 leading-relaxed"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Submitting Deletion Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Data Deletion Request</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
