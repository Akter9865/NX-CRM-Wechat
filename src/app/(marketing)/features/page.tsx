import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  Users,
  Zap,
  Bot,
  GitBranch,
  ShoppingBag,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Features — WhatsApp CRM, Inbox, Automation & AI Suite',
  description:
    'Explore the complete feature suite of NX CRM: WhatsApp Cloud API, Multi-Agent Shared Inbox, Visual Automation Builder, AI Auto-Replies, Lead Pipelines, and Analytics.',
};

const FEATURE_MODULES = [
  {
    slug: 'whatsapp-crm',
    title: 'WhatsApp Cloud CRM',
    tagline: 'Direct Meta Graph API integration with zero markup fees.',
    desc: 'Organize incoming conversations like a professional CRM. Centralize contact records, custom attributes, tags, notes, verified message templates, and real-time delivery receipts.',
    icon: MessageSquare,
    color: 'text-emerald-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    image: '/images/marketing/hero-showcase.png',
    bullets: [
      'Official Meta WhatsApp Cloud API connection',
      'Contact tagging, custom fields & segmentation',
      'Verified HSM message templates & quick replies',
      'Real-time sent, delivered, and read receipt tracking',
    ],
  },
  {
    slug: 'shared-inbox',
    title: 'Multi-Agent Shared Inbox',
    tagline: 'Collaborative customer messaging with role permissions.',
    desc: 'Empower your sales and support team to handle customer chats from one shared interface. Assign chats, leave private internal notes, and track the 24-hour customer service window timer.',
    icon: Users,
    color: 'text-blue-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    bullets: [
      'Multi-agent chat assignment & claim buttons',
      'Private internal notes for team context',
      'Live 24-hour service window timer countdown',
      'Audio voice notes playback & rich media support',
    ],
  },
  {
    slug: 'automation',
    title: 'Visual Workflow Builder',
    tagline: 'Drag-and-drop automation without code.',
    desc: 'Build intelligent multi-branch customer journeys. Trigger on incoming keywords or ad clicks, check contact tags, inject dynamic delay nodes, dispatch interactive quick replies, and invoke outbound webhooks.',
    icon: Zap,
    color: 'text-amber-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    bullets: [
      'Keyword match and sponsored Meta ad triggers',
      'Condition branches (is customer, tag equals)',
      'Scheduled delays & cron execution timers',
      'Outbound JSON webhook triggers to external apps',
    ],
  },
  {
    slug: 'ai-agents',
    title: 'AI Auto-Replies & Agents',
    tagline: 'Contextual drafts powered by Gemini & OpenAI.',
    desc: 'Bring your own API key to empower agents with intelligent one-click drafts, automatic conversation summaries, intent classification, and grounding against your internal business Knowledge Base.',
    icon: Bot,
    color: 'text-purple-600',
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    bullets: [
      'BYOK model (Google Gemini 2.5 Flash, OpenAI GPT-4o)',
      'Instant thread summarization for shift handoffs',
      'RAG knowledge base grounding on business documents',
      'Human-in-the-loop review before sending',
    ],
  },
  {
    slug: 'lead-management',
    title: 'Visual Pipelines & Kanban Deals',
    tagline: 'Track sales opportunities systematically.',
    desc: 'Turn chat interactions into revenue. Move leads across customizable deal stages on drag-and-drop Kanban boards, track deal values, and organize contacts by interest tags.',
    icon: GitBranch,
    color: 'text-teal-600',
    border: 'border-teal-200',
    bg: 'bg-teal-50',
    image: '/images/marketing/lead-generation.png',
    bullets: [
      'Drag-and-drop Kanban board interface',
      'Custom deal value & currency tracking',
      'One-click contact profile view & deal stage history',
      'Stage progression filters & lead source attribution',
    ],
  },
  {
    slug: 'whatsapp-commerce',
    title: 'WhatsApp E-Commerce & Checkout',
    tagline: 'Order confirmations and in-chat Razorpay payment links.',
    desc: 'Convert product interest into paid transactions right inside WhatsApp. Generate dynamic UPI and credit card checkout links with Razorpay and trigger automated order dispatch updates.',
    icon: ShoppingBag,
    color: 'text-rose-600',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    image: '/images/marketing/commerce-order.png',
    bullets: [
      'Dynamic Razorpay & PhonePe payment links in chat',
      'UPI QR code delivery directly in conversation thread',
      'Automated order confirmation template dispatches',
      'Tracking number and dispatch status notifications',
    ],
  },
  {
    slug: 'analytics',
    title: 'Operational Analytics & Reports',
    tagline: 'Real-time metrics on team speed and message volume.',
    desc: 'Monitor team performance metrics: First Response Time (FRT), resolution rates, conversation volume trends by hour and day, broadcast delivery delivery rates, and agent workload distribution.',
    icon: BarChart3,
    color: 'text-indigo-600',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    bullets: [
      'First Response Time (FRT) and resolution metrics',
      'Inbound vs outbound conversation volume breakdown',
      'Automation execution and webhook delivery counts',
      'Pipeline win/loss conversion ratios',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-16 md:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            <span>Enterprise Capabilities</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Features Designed for{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Growth & Scale
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Discover how NX CRM transforms WhatsApp from a chaotic mobile app into a structured, automated, and collaborative customer acquisition engine.
          </p>
        </div>

        {/* Feature Modules Grid */}
        <div className="space-y-16">
          {FEATURE_MODULES.map((module, idx) => {
            const Icon = module.icon;
            const isReversed = idx % 2 === 1;

            return (
              <div
                key={module.slug}
                className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-md hover:shadow-xl transition-all"
              >
                <div className={`grid grid-cols-1 ${module.image ? 'lg:grid-cols-2' : ''} gap-10 items-center`}>
                  <div className={`space-y-6 ${isReversed && module.image ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex size-12 items-center justify-center rounded-2xl border ${module.border} ${module.bg}`}>
                        <Icon className={`size-6 ${module.color}`} />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                          {module.title}
                        </h2>
                        <p className="text-xs text-slate-500">{module.tagline}</p>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed">
                      {module.desc}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {module.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-slate-700 font-medium">{bullet}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                      <Link href={`/features/${module.slug}`}>
                        <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-6 shadow-md shadow-emerald-600/20 flex items-center gap-2">
                          <span>Deep Dive: {module.title}</span>
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {module.image && (
                    <div className={`${isReversed ? 'lg:order-1' : ''} relative`}>
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xl">
                        <Image
                          src={module.image}
                          alt={module.title}
                          width={600}
                          height={400}
                          className="w-full h-auto object-cover rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 p-10 sm:p-14 shadow-md">
          <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Ready to experience these features live?
          </h3>
          <p className="text-slate-600 text-sm max-w-xl mx-auto mb-8">
            Create your free workspace in 60 seconds with no credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20">
              <span>Start Free Today</span>
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
