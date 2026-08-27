import Link from 'next/link';
import { siteConfig } from '@/lib/config/site';
import { BrandLogo } from './brand-logo';
import {
  MessageSquare,
  Shield,
  Zap,
  Lock,
  ExternalLink,
  MessageCircle,
  PhoneCall,
  Mail,
  MapPin,
} from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const cleanPhone = siteConfig.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hi NX CRM Team! I would like more information about your WhatsApp Cloud CRM platform.'
  )}`;

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600">
      {/* Top Value Banner */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Official WhatsApp Cloud API</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Direct Meta Graph API v22.0 connection with zero third-party markups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
              <Lock className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Multi-Tenant Isolation & RLS</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                AES-256 token encryption, HMAC webhooks & Supabase Row Level Security.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-200 text-purple-600 shrink-0">
              <Zap className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Instant Razorpay Activation</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Monthly transparent INR subscriptions with immediate entitlement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 space-y-4">
            <BrandLogo size="md" />

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              The modern WhatsApp CRM, Shared Inbox, and Visual Automation platform designed for growing businesses, sales teams, and agencies.
            </p>

            <div className="pt-2 text-xs space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <PhoneCall className="size-3.5 text-emerald-600 shrink-0" />
                <a href={`tel:${siteConfig.phone}`} className="text-slate-800 font-semibold hover:text-emerald-700 hover:underline">
                  {siteConfig.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-blue-600 shrink-0" />
                <a href={`mailto:${siteConfig.supportEmail}`} className="text-slate-800 font-semibold hover:text-blue-700 hover:underline">
                  {siteConfig.supportEmail}
                </a>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1">
                <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{siteConfig.businessAddress}</span>
              </div>
            </div>

            {/* Quick WhatsApp Chat Button in Footer */}
            <div className="pt-1">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 transition-colors text-xs font-semibold shadow-2xs"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                <span>Chat with WhatsApp Support</span>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/features/whatsapp-crm" className="hover:text-emerald-700 transition-colors">
                  WhatsApp CRM
                </Link>
              </li>
              <li>
                <Link href="/features/shared-inbox" className="hover:text-emerald-700 transition-colors">
                  Shared Inbox
                </Link>
              </li>
              <li>
                <Link href="/features/automation" className="hover:text-emerald-700 transition-colors">
                  Automation Flows
                </Link>
              </li>
              <li>
                <Link href="/features/ai-agents" className="hover:text-emerald-700 transition-colors">
                  AI Auto-Replies
                </Link>
              </li>
              <li>
                <Link href="/features/lead-management" className="hover:text-emerald-700 transition-colors">
                  Lead Pipelines
                </Link>
              </li>
              <li>
                <Link href="/features/whatsapp-commerce" className="hover:text-emerald-700 transition-colors">
                  WhatsApp Commerce
                </Link>
              </li>
              <li>
                <Link href="/features/analytics" className="hover:text-emerald-700 transition-colors">
                  Analytics & Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Integrations & Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/pricing" className="hover:text-emerald-700 transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="hover:text-emerald-700 transition-colors">
                  Integrations Hub
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-emerald-700 transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-emerald-700 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-emerald-700 transition-colors">
                  Help & Support Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-700 transition-colors">
                  Contact Sales & Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Meta Tech Provider Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Legal & Compliance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-emerald-700 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-emerald-700 transition-colors">
                  Privacy Policy (GDPR/DPDP)
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-emerald-700 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/acceptable-use" className="hover:text-emerald-700 transition-colors">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-emerald-700 transition-colors">
                  Cancellation & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-emerald-700 transition-colors">
                  Security & Architecture
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-emerald-700 transition-colors">
                  User Data Deletion Request
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {currentYear} <strong>NX CRM</strong>. All rights reserved. Operating under{' '}
            <strong className="text-slate-700">Nexora Spark Agency</strong>.
          </div>

          <div className="flex items-center gap-6">
            <span className="text-[11px]">
              Jurisdiction: <strong>West Bengal, India</strong>
            </span>
            <span className="text-[11px]">
              WhatsApp Cloud API: <strong className="text-emerald-700">Meta v22.0</strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
