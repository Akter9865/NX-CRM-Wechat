'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Mail,
  CreditCard,
  Radio,
  Shield,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  Share2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General Settings State
  const [platformName, setPlatformName] = useState('NX CRM');
  const [companyName, setCompanyName] = useState('Nexora Spark Agency');
  const [supportEmail, setSupportEmail] = useState('nexorasparkagencyofficial@gmail.com');
  const [salesEmail, setSalesEmail] = useState('nexorasparkagencyofficial@gmail.com');
  const [phone, setPhone] = useState('+91 8653678794');
  const [businessAddress, setBusinessAddress] = useState('Sripur Bazar, Balagarh, West Bengal 712514, India');
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Meta Embedded Signup State
  const [metaEmbeddedEnabled, setMetaEmbeddedEnabled] = useState(true);
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaConfigId, setMetaConfigId] = useState('');
  const [metaSystemUserToken, setMetaSystemUserToken] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [testingMeta, setTestingMeta] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Auth & Google Login State
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(true);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [openSignupsEnabled, setOpenSignupsEnabled] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);

  // Billing Settings State
  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [invoicePrefix, setInvoicePrefix] = useState('NX-INV');

  // Payment Gateway Settings State
  const [activeGateway, setActiveGateway] = useState('razorpay');
  const [gatewayMode, setGatewayMode] = useState('test');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [upiId, setUpiId] = useState('8653678794@upi');
  const [upiBusinessName, setUpiBusinessName] = useState('NX CRM / Nexora Spark Agency');
  const [manualQrEnabled, setManualQrEnabled] = useState(true);
  const [autoActivate, setAutoActivate] = useState(true);

  // Testing Gateway State
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success && data.settings) {
        const { general, billing, payment_gateway, meta_embedded_signup, auth_providers } = data.settings;
        if (general) {
          setPlatformName(general.platform_name || 'NX CRM');
          setCompanyName(general.company_name || 'Nexora Spark Agency');
          setSupportEmail(general.support_email || 'nexorasparkagencyofficial@gmail.com');
          setSalesEmail(general.sales_email || 'nexorasparkagencyofficial@gmail.com');
          setPhone(general.phone || '+91 8653678794');
          setBusinessAddress(general.business_address || 'Sripur Bazar, Balagarh, West Bengal 712514, India');
          setDefaultTrialDays(general.default_trial_days || 14);
          setMaintenanceMode(Boolean(general.maintenance_mode));
        }
        if (meta_embedded_signup) {
          setMetaEmbeddedEnabled(meta_embedded_signup.enabled !== false);
          setMetaAppId(meta_embedded_signup.app_id || '');
          setMetaAppSecret(meta_embedded_signup.app_secret || '');
          setMetaConfigId(meta_embedded_signup.config_id || '');
          setMetaSystemUserToken(meta_embedded_signup.system_user_token || '');
          setMetaWabaId(meta_embedded_signup.waba_id || '');
        }
        if (auth_providers) {
          setGoogleOAuthEnabled(auth_providers.google_oauth_enabled !== false);
          setGoogleClientId(auth_providers.google_client_id || '');
          setGoogleClientSecret(auth_providers.google_client_secret || '');
          setOpenSignupsEnabled(auth_providers.open_signups_enabled !== false);
          setRequireEmailVerification(Boolean(auth_providers.require_email_verification));
        }
        if (billing) {
          setGracePeriodDays(billing.grace_period_days || 3);
          setTaxPercentage(billing.tax_percentage || 18);
          setInvoicePrefix(billing.invoice_prefix || 'NX-INV');
        }
        if (payment_gateway) {
          setActiveGateway(payment_gateway.active_gateway || 'razorpay');
          setGatewayMode(payment_gateway.mode || 'test');
          setRazorpayKeyId(payment_gateway.razorpay_key_id || '');
          setRazorpayKeySecret(payment_gateway.razorpay_key_secret || '');
          setRazorpayWebhookSecret(payment_gateway.razorpay_webhook_secret || '');
          setUpiId(payment_gateway.upi_id || '8653678794@upi');
          setUpiBusinessName(payment_gateway.upi_business_name || 'NX CRM / Nexora Spark Agency');
          setManualQrEnabled(payment_gateway.manual_qr_enabled !== false);
          setAutoActivate(payment_gateway.auto_activate_on_payment !== false);
        }
      }
    } catch (err) {
      console.error('[Fetch Settings Error]:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveMetaEmbedded = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'meta_embedded_signup',
          value: {
            enabled: metaEmbeddedEnabled,
            app_id: metaAppId,
            app_secret: metaAppSecret,
            config_id: metaConfigId,
            system_user_token: metaSystemUserToken,
            waba_id: metaWabaId,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Meta Tech Provider & Embedded Signup settings saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving Meta settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestMeta = async () => {
    setTestingMeta(true);
    setMetaTestResult(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_meta_credentials',
          appId: metaAppId,
          appSecret: metaAppSecret,
          token: metaSystemUserToken,
        }),
      });

      const data = await res.json();
      setMetaTestResult(data);

      if (data.success) {
        toast.success(`Meta API verified in ${data.latencyMs}ms`);
      } else {
        toast.error(data.error || 'Meta test failed');
      }
    } catch {
      toast.error('Failed to test Meta Graph API connection');
    } finally {
      setTestingMeta(false);
    }
  };

  const handleSaveAuthProviders = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'auth_providers',
          value: {
            google_oauth_enabled: googleOAuthEnabled,
            google_client_id: googleClientId,
            google_client_secret: googleClientSecret,
            open_signups_enabled: openSignupsEnabled,
            require_email_verification: requireEmailVerification,
            default_trial_days: Number(defaultTrialDays),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Google OAuth & Auth settings saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving auth settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'general',
          value: {
            platform_name: platformName,
            company_name: companyName,
            support_email: supportEmail,
            sales_email: salesEmail,
            phone,
            business_address: businessAddress,
            default_trial_days: Number(defaultTrialDays),
            maintenance_mode: maintenanceMode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('General settings saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'billing',
          value: {
            grace_period_days: Number(gracePeriodDays),
            tax_percentage: Number(taxPercentage),
            invoice_prefix: invoicePrefix,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Billing parameters saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving billing settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'payment_gateway',
          value: {
            active_gateway: activeGateway,
            mode: gatewayMode,
            currency: 'INR',
            razorpay_key_id: razorpayKeyId,
            razorpay_key_secret: razorpayKeySecret,
            razorpay_webhook_secret: razorpayWebhookSecret,
            upi_id: upiId,
            upi_business_name: upiBusinessName,
            manual_qr_enabled: manualQrEnabled,
            auto_activate_on_payment: autoActivate,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Payment Gateway integration settings saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving payment settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setGatewayTestResult(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_payment_gateway',
          keyId: razorpayKeyId,
          keySecret: razorpayKeySecret,
        }),
      });

      const data = await res.json();
      setGatewayTestResult(data);

      if (data.success) {
        toast.success(`Gateway verified in ${data.latencyMs}ms`);
      } else {
        toast.error(data.error || 'Gateway test failed');
      }
    } catch {
      toast.error('Failed to run gateway connection test');
    } finally {
      setTestingGateway(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
          Global Platform & SaaS Control Center
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Admin controls for Meta Tech Provider credentials, Google OAuth authentication, Razorpay gateway, branding, and billing lifecycles.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <span>Loading platform settings...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Meta Embedded Signup & Tech Provider Configuration */}
          <form onSubmit={handleSaveMetaEmbedded} className="rounded-3xl border border-blue-500/30 bg-card/70 p-6 sm:p-8 space-y-6 shadow-lg shadow-blue-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
              <div className="flex items-center gap-2.5">
                <Radio className="size-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-foreground">Meta Tech Provider & Embedded Signup Builder</h3>
                  <p className="text-[11px] text-muted-foreground">Configure Facebook Business Extension (FBE), Meta App ID/Secret, and System User tokens for instant client WABA onboarding.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testingMeta}
                  onClick={handleTestMeta}
                  className="rounded-xl border-border bg-card text-xs font-semibold flex items-center gap-1.5"
                >
                  {testingMeta ? <Loader2 className="size-3.5 animate-spin text-blue-400" /> : <Zap className="size-3.5 text-amber-400" />}
                  <span>Test Meta Graph API</span>
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                  Save Meta Config
                </Button>
              </div>
            </div>

            {metaTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                  metaTestResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {metaTestResult.success ? (
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-4 text-rose-400 shrink-0" />
                  )}
                  <span>{metaTestResult.message || metaTestResult.error}</span>
                </div>
                {metaTestResult.latencyMs !== undefined && (
                  <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30">
                    {metaTestResult.latencyMs}ms
                  </Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Meta App ID</Label>
                <Input
                  placeholder="e.g. 123456789012345"
                  value={metaAppId}
                  onChange={(e) => setMetaAppId(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Meta App Secret</Label>
                <Input
                  type="password"
                  placeholder="Enter Meta app secret..."
                  value={metaAppSecret}
                  onChange={(e) => setMetaAppSecret(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Embedded Signup Config ID (FBE)</Label>
                <Input
                  placeholder="e.g. 987654321098765"
                  value={metaConfigId}
                  onChange={(e) => setMetaConfigId(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">System User Permanent Access Token</Label>
                <Input
                  type="password"
                  placeholder="EAA..."
                  value={metaSystemUserToken}
                  onChange={(e) => setMetaSystemUserToken(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                  <div>
                    <Label className="text-xs font-semibold text-foreground cursor-pointer">
                      Enable Meta Embedded Signup Flow
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Allows clients to connect their WhatsApp Business Account in 1-click via the official Meta dialog.</p>
                  </div>
                  <Switch checked={metaEmbeddedEnabled} onCheckedChange={setMetaEmbeddedEnabled} />
                </div>
              </div>
            </div>
          </form>

          {/* 2. Authentication & Social Sign-In (Google OAuth) */}
          <form onSubmit={handleSaveAuthProviders} className="rounded-3xl border border-indigo-500/30 bg-card/70 p-6 sm:p-8 space-y-6 shadow-lg shadow-indigo-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="size-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-foreground">Authentication & Google OAuth Sign-In</h3>
                  <p className="text-[11px] text-muted-foreground">Control candidate/client social sign-in credentials, open signup registrations, and email verification.</p>
                </div>
              </div>
              <Button type="submit" size="sm" disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                Save Auth Settings
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Google OAuth Client ID</Label>
                <Input
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Google OAuth Client Secret</Label>
                <Input
                  type="password"
                  placeholder="Enter Google OAuth client secret..."
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <Label className="text-xs font-semibold text-foreground cursor-pointer">
                    Sign in with Google Enabled
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Show &apos;Continue with Google&apos; button on login &amp; signup pages.</p>
                </div>
                <Switch checked={googleOAuthEnabled} onCheckedChange={setGoogleOAuthEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <Label className="text-xs font-semibold text-foreground cursor-pointer">
                    Allow Open Client Signups
                  </Label>
                  <p className="text-[10px] text-muted-foreground">When disabled, only admins can create new client workspace accounts.</p>
                </div>
                <Switch checked={openSignupsEnabled} onCheckedChange={setOpenSignupsEnabled} />
              </div>
            </div>
          </form>

          {/* 3. Payment Gateways & Direct Activation */}
          <form onSubmit={handleSavePaymentGateway} className="rounded-3xl border border-emerald-500/30 bg-card/70 p-6 sm:p-8 space-y-6 shadow-lg shadow-emerald-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-foreground">Payment Gateways & Direct Activation</h3>
                  <p className="text-[11px] text-muted-foreground">Admin control over Razorpay API credentials, webhook verification, and UPI QR codes.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={testingGateway}
                  onClick={handleTestGateway}
                  className="rounded-xl border-border bg-card text-xs font-semibold flex items-center gap-1.5"
                >
                  {testingGateway ? <Loader2 className="size-3.5 animate-spin text-emerald-400" /> : <Zap className="size-3.5 text-amber-400" />}
                  <span>Test Connection</span>
                </Button>
                <Button type="submit" size="sm" disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                  Save Gateway Config
                </Button>
              </div>
            </div>

            {gatewayTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                  gatewayTestResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {gatewayTestResult.success ? (
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-4 text-rose-400 shrink-0" />
                  )}
                  <span>{gatewayTestResult.message || gatewayTestResult.error}</span>
                </div>
                {gatewayTestResult.latencyMs !== undefined && (
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30">
                    {gatewayTestResult.latencyMs}ms
                  </Badge>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Active Payment Gateway</Label>
                <Select value={activeGateway} onValueChange={(val) => setActiveGateway(val || 'razorpay')}>
                  <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay (India - UPI, Cards, Netbanking)</SelectItem>
                    <SelectItem value="cashfree">Cashfree Payments (India)</SelectItem>
                    <SelectItem value="stripe">Stripe (International)</SelectItem>
                    <SelectItem value="manual_upi">Manual UPI / QR Bank Transfer Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Gateway Environment Mode</Label>
                <Select value={gatewayMode} onValueChange={(val) => setGatewayMode(val || 'test')}>
                  <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test Mode (Sandbox / Staging)</SelectItem>
                    <SelectItem value="live">Live Production (Real INR Transactions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Razorpay Key ID</Label>
                <Input
                  placeholder="rzp_test_... or rzp_live_..."
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Razorpay Key Secret</Label>
                <Input
                  type="password"
                  placeholder="Enter secret key..."
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Razorpay Webhook Secret</Label>
                <Input
                  type="password"
                  placeholder="Enter webhook secret..."
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Direct Business UPI ID</Label>
                <Input
                  placeholder="e.g. 8653678794@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs font-mono focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                  Instant Auto-Activation on Payment
                </Label>
                <Switch checked={autoActivate} onCheckedChange={setAutoActivate} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                  Manual UPI QR Code Enabled
                </Label>
                <Switch checked={manualQrEnabled} onCheckedChange={setManualQrEnabled} />
              </div>
            </div>
          </form>

          {/* 4. General Platform Config */}
          <form onSubmit={handleSaveGeneral} className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Building className="size-5 text-blue-400" />
                <h3 className="text-base font-bold text-foreground">General Platform & Organization</h3>
              </div>
              <Button type="submit" size="sm" disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                Save General Settings
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Platform Brand Name</Label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Parent Operating Agency</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Official Email Address</Label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Official Phone / WhatsApp</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">Official Business Address</Label>
                <Input
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Default Free Trial Duration (Days)</Label>
                <Input
                  type="number"
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 mt-auto">
                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                  Platform Maintenance Mode
                </Label>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
            </div>
          </form>

          {/* 5. Billing Parameters */}
          <form onSubmit={handleSaveBilling} className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Shield className="size-5 text-purple-400" />
                <h3 className="text-base font-bold text-foreground">Billing Lifecycle & Grace Periods</h3>
              </div>
              <Button type="submit" size="sm" disabled={saving} className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs">
                Save Billing Config
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Subscription Grace Period (Days)</Label>
                <Input
                  type="number"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">GST / Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(Number(e.target.value))}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Invoice Sequence Prefix</Label>
                <Input
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-purple-500"
                />
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
