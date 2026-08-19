import { BillingDashboard } from '@/components/billing/billing-dashboard';

export const metadata = {
  title: 'Billing & Usage — NX CRM Wechat',
  description: 'Manage your plan subscription, quotas, and payment history.',
};

export default function BillingPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitor your contact capacity, monthly message usage, and active Razorpay subscription.
        </p>
      </div>

      <BillingDashboard />
    </div>
  );
}
