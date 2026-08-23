import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Mail,
  MessageCircle,
  Camera,
  Share2,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHANNELS = [
  {
    name: 'WhatsApp Cloud API',
    desc: 'Official Meta Graph API with shared inbox, verified templates, media, and visual automations.',
    status: 'Available',
    icon: MessageSquare,
    badgeColor: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200',
  },
  {
    name: 'Telegram Bot',
    desc: 'Connect Telegram bot channels to receive alerts, customer queries, and trigger automated flows.',
    status: 'Available',
    icon: Send,
    badgeColor: 'border-blue-200 bg-blue-50 text-blue-800',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  {
    name: 'Website Live Chat',
    desc: 'Embed a lightweight live chat widget on your website that feeds inquiries directly into NX CRM.',
    status: 'Available',
    icon: Globe,
    badgeColor: 'border-teal-200 bg-teal-50 text-teal-800',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-200',
  },
  {
    name: 'Email Alerts (SMTP / Zoho)',
    desc: 'Instant lead forwarding and escalation notifications to your sales reps via standard SMTP or Zoho.',
    status: 'Available',
    icon: Mail,
    badgeColor: 'border-purple-200 bg-purple-50 text-purple-800',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200',
  },
  {
    name: 'Instagram Direct',
    desc: 'Unified Instagram DM inbox and comment-to-DM automation for social sales campaigns.',
    status: 'Coming Soon',
    icon: Camera,
    badgeColor: 'border-pink-200 bg-pink-50 text-pink-800',
    iconColor: 'text-pink-600',
    iconBg: 'bg-pink-50 border-pink-200',
  },
  {
    name: 'Facebook Messenger',
    desc: 'Centralize Facebook Page messages and Click-to-Messenger ad conversations in your CRM.',
    status: 'Coming Soon',
    icon: Share2,
    badgeColor: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50 border-indigo-200',
  },
];

export function OmnichannelSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50/60 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-800">
            <span>Omnichannel Ecosystem</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Bring Customer Conversations Into{' '}
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
              One Workspace
            </span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Manage your core WhatsApp traffic today, with native support for Telegram, Live Chat, and SMTP alerts, plus incoming Instagram and Messenger channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {CHANNELS.map((channel, idx) => {
            const Icon = channel.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex size-10 items-center justify-center rounded-xl border ${channel.iconBg}`}>
                    <Icon className={`size-5 ${channel.iconColor}`} />
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${channel.badgeColor}`}
                  >
                    {channel.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{channel.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{channel.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link href="/integrations">
            <Button className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-6 shadow-md shadow-blue-600/20 inline-flex items-center gap-2">
              <span>View All Supported Integrations</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
