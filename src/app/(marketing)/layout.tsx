import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';

export const metadata = {
  title: {
    default: 'NX CRM — WhatsApp CRM, Automation & AI for Growing Businesses',
    template: '%s | NX CRM',
  },
  description:
    'Manage WhatsApp conversations, contacts, visual automations, AI auto-replies, and multi-agent customer workflows in one modern CRM. Powered by Nexora Spark Agency.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nxcrm.online'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NX CRM — WhatsApp CRM, Automation & AI for Growing Businesses',
    description:
      'Manage WhatsApp conversations, contacts, visual automations, AI auto-replies, and multi-agent customer workflows in one modern CRM.',
    url: 'https://nxcrm.online',
    siteName: 'NX CRM',
    locale: 'en_US',
    type: 'website',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
