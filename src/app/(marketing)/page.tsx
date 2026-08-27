import { HeroSection } from '@/components/marketing/hero-section';
import { TrustPoints } from '@/components/marketing/trust-points';
import { WhyNxCrm } from '@/components/marketing/why-nxcrm';
import { WhatsAppCrmSection } from '@/components/marketing/whatsapp-crm-section';
import { SharedInboxSection } from '@/components/marketing/shared-inbox-section';
import { AutomationSection } from '@/components/marketing/automation-section';
import { AiSection } from '@/components/marketing/ai-section';
import { OmnichannelSection } from '@/components/marketing/omnichannel-section';
import { LeadManagementSection } from '@/components/marketing/lead-management-section';
import { CommerceSection } from '@/components/marketing/commerce-section';
import { AnalyticsSection } from '@/components/marketing/analytics-section';
import { IntegrationsPreview } from '@/components/marketing/integrations-preview';
import { PricingPreview } from '@/components/marketing/pricing-preview';
import { ContactSection } from '@/components/marketing/contact-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { FinalCtaSection } from '@/components/marketing/final-cta-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustPoints />
      <WhyNxCrm />
      <WhatsAppCrmSection />
      <SharedInboxSection />
      <AutomationSection />
      <AiSection />
      <OmnichannelSection />
      <LeadManagementSection />
      <CommerceSection />
      <AnalyticsSection />
      <IntegrationsPreview />
      <PricingPreview />
      <ContactSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
