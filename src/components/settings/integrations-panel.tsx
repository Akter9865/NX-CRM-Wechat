'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Mail,
  Send,
  CreditCard,
  Smartphone,
  Wallet,
  DollarSign,
  Calendar,
  CalendarDays,
  Webhook,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Save,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SettingsPanelHead } from './settings-panel-head';
import {
  INTEGRATION_DEFINITIONS,
  type IntegrationCategory,
  type IntegrationDefinition,
  type IntegrationId,
} from '@/lib/integrations/types';

const ICON_MAP: Record<string, any> = {
  FileSpreadsheet,
  Mail,
  Send,
  CreditCard,
  Smartphone,
  Wallet,
  DollarSign,
  Calendar,
  CalendarDays,
  Webhook,
};

const CATEGORIES: { id: 'all' | IntegrationCategory; label: string }[] = [
  { id: 'all', label: 'All Integrations' },
  { id: 'leads', label: '📊 Lead & Sheets' },
  { id: 'payments', label: '💳 Payment Gateways' },
  { id: 'email', label: '✉️ Email & Alerts' },
  { id: 'calendar', label: '📅 Booking & Calendar' },
  { id: 'automation', label: '⚡ Custom Webhooks' },
];

export function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Config State
  const [activeModalItem, setActiveModalItem] = useState<IntegrationDefinition | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/account/integrations');
      const data = await res.json();
      if (data.success && Array.isArray(data.integrations)) {
        const map: Record<string, any> = {};
        data.integrations.forEach((item: any) => {
          map[item.integration_id] = item;
        });
        setIntegrations(map);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleOpenConfig = (item: IntegrationDefinition) => {
    const existing = integrations[item.id];
    setActiveModalItem(item);
    setConfigForm(existing?.config || {});
    setIsEnabled(existing?.is_enabled ?? true);
  };

  const handleFieldChange = (key: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveConfig = async () => {
    if (!activeModalItem) return;

    setSaving(true);
    try {
      const res = await fetch('/api/account/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_id: activeModalItem.id,
          is_enabled: isEnabled,
          config: configForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save integration settings');
      }

      toast.success(data.message || `${activeModalItem.name} configured successfully!`);
      setIntegrations((prev) => ({
        ...prev,
        [activeModalItem.id]: {
          integration_id: activeModalItem.id,
          is_enabled: isEnabled,
          config: configForm,
          updated_at: new Date().toISOString(),
        },
      }));
      setActiveModalItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeModalItem) return;

    setTesting(true);
    try {
      const res = await fetch('/api/account/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_id: activeModalItem.id,
          config: configForm,
          action: 'test',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Connection test failed');
      }

      toast.success(data.message || 'Connection test successful!');
    } catch (err: any) {
      toast.error(err.message || 'Test failed. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  };

  const allItems = Object.values(INTEGRATION_DEFINITIONS);

  const filteredItems = allItems.filter((item) => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Integrations & Apps Hub"
        description="Connect Google Sheets for real-time lead sync, Zoho Mail/SMTP, Razorpay/PhonePe payment gateways, and Calendly with your WhatsApp CRM."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-card"
          />
        </div>
      </div>

      {/* Grid of Integrations */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border/60 bg-card/40 animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/80 rounded-2xl p-6">
          <Layers className="size-8 text-muted-foreground/60 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-foreground">No integrations found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query or filter category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] || Webhook;
            const savedState = integrations[item.id];
            const isConfigured = Boolean(savedState?.config && Object.keys(savedState.config).length > 0);
            const isLive = isConfigured && savedState?.is_enabled;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary transition-transform duration-200 group-hover:scale-105">
                        <Icon className="size-5.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {item.categoryLabel}
                        </span>
                      </div>
                    </div>

                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground/90 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3.5">
                  <div className="flex items-center gap-1.5">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : isConfigured ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500">
                        <AlertCircle className="size-3" />
                        Disabled
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/80 font-medium">
                        Not configured
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isLive ? 'outline' : 'default'}
                    onClick={() => handleOpenConfig(item)}
                    className="h-8 text-xs font-semibold rounded-lg px-3"
                  >
                    {isConfigured ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integration Setup Dialog */}
      {activeModalItem && (
        <Dialog open={Boolean(activeModalItem)} onOpenChange={() => setActiveModalItem(null)}>
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  {(() => {
                    const ModalIcon = ICON_MAP[activeModalItem.iconName] || Webhook;
                    return <ModalIcon className="size-5" />;
                  })()}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    {activeModalItem.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {activeModalItem.categoryLabel} Configuration
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/30">
                <div>
                  <div className="text-xs font-semibold text-foreground">Active Integration</div>
                  <div className="text-[11px] text-muted-foreground">
                    Enable this integration for live automations & inbox actions.
                  </div>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              {/* Dynamic Field Inputs */}
              {activeModalItem.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <Select
                      value={configForm[field.key] || field.options?.[0]?.value || ''}
                      onValueChange={(val) => handleFieldChange(field.key, val)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={configForm[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                  )}

                  {field.helpText && (
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
                className="h-9 text-xs font-medium gap-1.5"
              >
                {testing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5 text-primary" />
                )}
                <span>Test Connection</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveModalItem(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="h-9 text-xs font-semibold gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  <span>Save Integration</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
