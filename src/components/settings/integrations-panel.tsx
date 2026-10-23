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
  RefreshCw,
  Plus,
  Trash2,
  Video,
  Clock,
  Check,
  Code2,
  Copy,
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
import { BrandLogo } from '@/components/integrations/brand-logos';
import { GoogleIcon } from '@/components/auth/google-auth-button';
import {
  INTEGRATION_DEFINITIONS,
  type IntegrationCategory,
  type IntegrationDefinition,
  type IntegrationId,
} from '@/lib/integrations/types';
import { cn } from '@/lib/utils';

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

const APPS_SCRIPT_TEMPLATE = `// NX CRM Google Sheets Webhook Script
// 1. In Google Sheets: Click Extensions -> Apps Script
// 2. Replace all code with this snippet
// 3. Click Deploy -> New deployment
// 4. Select type: "Web app"
// 5. Execute as: "Me", Who has access: "Anyone"
// 6. Click Deploy and copy the Web App URL into NX CRM

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Auto-create header row if sheet is brand new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Phone", "Email", "Status / Stage", "Tags", "Notes", "Source"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
    }
    
    sheet.appendRow([
      new Date().toLocaleString(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.stage || data.status || 'Lead',
      data.tags || '',
      data.notes || '',
      data.source || 'NX CRM WhatsApp'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Lead added" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Connecting in-flight tracker
  const [connectingService, setConnectingService] = useState<string | null>(null);

  // Modal / Config State
  const [activeModalItem, setActiveModalItem] = useState<IntegrationDefinition | null>(null);
  const [googleAuthTab, setGoogleAuthTab] = useState<'oauth' | 'manual'>('oauth');
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Google Sheets Specific State
  const [spreadsheetsList, setSpreadsheetsList] = useState<any[]>([]);
  const [loadingSpreadsheets, setLoadingSpreadsheets] = useState(false);
  const [sheetTabsList, setSheetTabsList] = useState<any[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [creatingDefaultSheet, setCreatingDefaultSheet] = useState(false);

  // Google Calendar Specific State
  const [calendarsList, setCalendarsList] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

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
        return map;
      }
      return {};
    } catch (error) {
      console.error('Failed to load integrations:', error);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Handle URL callback parameters from Google OAuth
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connectedService = params.get('connected');
    const authError = params.get('error');

    if (connectedService) {
      const friendlyName =
        connectedService === 'google_sheets' ? 'Google Sheets' : 'Google Calendar';
      toast.success(`${friendlyName} connected successfully via Google OAuth!`, {
        description: 'You can now select spreadsheets, worksheets, or calendars.',
      });
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations');
      fetchIntegrations().then((map) => {
        const def = INTEGRATION_DEFINITIONS[connectedService as IntegrationId];
        if (def && map[connectedService]) {
          setActiveModalItem(def);
          setConfigForm(map[connectedService].config || {});
          setIsEnabled(map[connectedService].is_enabled ?? true);
          setGoogleAuthTab('oauth');
          if (connectedService === 'google_sheets') {
            loadGoogleSheetsData(map[connectedService].config?.selected_spreadsheet_id);
          } else if (connectedService === 'google_calendar') {
            loadGoogleCalendarsData();
          }
        }
      });
    } else if (authError) {
      toast.error('Google authorization error', {
        description: decodeURIComponent(authError),
      });
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations');
    }
  }, [fetchIntegrations]);

  // Load Google Spreadsheets when Sheets modal opens
  const loadGoogleSheetsData = useCallback(async (currentSheetId?: string) => {
    setLoadingSpreadsheets(true);
    try {
      const res = await fetch('/api/integrations/google/sheets');
      const data = await res.json();
      if (data.success && Array.isArray(data.spreadsheets)) {
        setSpreadsheetsList(data.spreadsheets);

        // If a sheet is already selected, load its worksheet tabs
        const targetSheetId = currentSheetId || data.spreadsheets[0]?.id;
        if (targetSheetId) {
          loadSheetTabs(targetSheetId);
        }
      }
    } catch (err) {
      console.warn('[Integrations] Could not load spreadsheets list:', err);
    } finally {
      setLoadingSpreadsheets(false);
    }
  }, []);

  const loadSheetTabs = async (sheetId: string) => {
    setLoadingTabs(true);
    try {
      const res = await fetch(
        `/api/integrations/google/sheets?spreadsheet_id=${encodeURIComponent(sheetId)}`
      );
      const data = await res.json();
      if (data.success && data.details?.sheets?.length > 0) {
        setSheetTabsList(data.details.sheets);
      }
    } catch (err) {
      console.warn('[Integrations] Could not load tabs for sheet:', err);
    } finally {
      setLoadingTabs(false);
    }
  };

  // Load Google Calendars when Calendar modal opens
  const loadGoogleCalendarsData = useCallback(async () => {
    setLoadingCalendars(true);
    try {
      const res = await fetch('/api/integrations/google/calendar');
      const data = await res.json();
      if (data.success && Array.isArray(data.calendars)) {
        setCalendarsList(data.calendars);
      }
    } catch (err) {
      console.warn('[Integrations] Could not load calendars list:', err);
    } finally {
      setLoadingCalendars(false);
    }
  }, []);

  const handleOpenConfig = (item: IntegrationDefinition, preferredTab?: 'oauth' | 'manual') => {
    const existing = integrations[item.id];
    setActiveModalItem(item);
    setConfigForm(existing?.config || {});
    setIsEnabled(existing?.is_enabled ?? true);

    const isGoogle = item.id === 'google_sheets' || item.id === 'google_calendar';
    const hasOAuth = Boolean(
      existing?.is_enabled && (existing?.encrypted_refresh_token || existing?.google_account_email)
    );
    const hasManual = Boolean(
      existing?.is_enabled &&
        !hasOAuth &&
        (existing?.config?.webhook_url || existing?.config?.calendar_id || existing?.config?.booking_link)
    );

    if (preferredTab) {
      setGoogleAuthTab(preferredTab);
    } else if (hasManual) {
      setGoogleAuthTab('manual');
    } else {
      setGoogleAuthTab('oauth');
    }

    if (item.id === 'google_sheets' && hasOAuth) {
      loadGoogleSheetsData(existing.config?.selected_spreadsheet_id);
    } else if (item.id === 'google_calendar' && hasOAuth) {
      loadGoogleCalendarsData();
    }
  };

  const handleConnectGoogle = (service: 'google_sheets' | 'google_calendar') => {
    setConnectingService(service);
    window.location.href = `/api/integrations/google/auth?service=${service}`;
  };

  const handleDisconnect = async (service: 'google_sheets' | 'google_calendar') => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      toast.success(data.message || 'Google integration disconnected.');
      setActiveModalItem(null);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Google account');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Google Sheets: Create New Default Spreadsheet
  const handleCreateNewSheet = async () => {
    setCreatingDefaultSheet(true);
    try {
      const res = await fetch('/api/integrations/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_default',
          title: 'NX CRM - WhatsApp Leads',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create spreadsheet');
      }

      toast.success('Created new Google Sheet!', {
        description: `"${data.spreadsheet.title}" is ready and connected.`,
      });

      // Update state with newly created sheet
      setSpreadsheetsList((prev) => [
        {
          id: data.spreadsheet.spreadsheetId,
          name: data.spreadsheet.title,
          url: data.spreadsheet.spreadsheetUrl,
        },
        ...prev,
      ]);

      setConfigForm((prev) => ({
        ...prev,
        selected_spreadsheet_id: data.spreadsheet.spreadsheetId,
        selected_spreadsheet_title: data.spreadsheet.title,
        selected_spreadsheet_url: data.spreadsheet.spreadsheetUrl,
        selected_sheet_name: 'WhatsApp Leads',
      }));

      loadSheetTabs(data.spreadsheet.spreadsheetId);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sheet');
    } finally {
      setCreatingDefaultSheet(false);
    }
  };

  // Google Sheets: Select existing spreadsheet
  const handleSelectSpreadsheet = async (sheetId: string) => {
    const found = spreadsheetsList.find((s) => s.id === sheetId);
    setConfigForm((prev) => ({
      ...prev,
      selected_spreadsheet_id: sheetId,
      selected_spreadsheet_title: found?.name || 'Selected Spreadsheet',
      selected_spreadsheet_url: found?.url,
    }));

    // Fetch tabs for this sheet
    setLoadingTabs(true);
    try {
      const res = await fetch(
        `/api/integrations/google/sheets?spreadsheet_id=${encodeURIComponent(sheetId)}`
      );
      const data = await res.json();
      if (data.success && data.details?.sheets?.length > 0) {
        setSheetTabsList(data.details.sheets);
        setConfigForm((prev) => ({
          ...prev,
          selected_sheet_name: data.details.sheets[0].title,
        }));
      }
    } catch (err) {
      console.warn('[Integrations] Could not load tabs for sheet:', err);
    } finally {
      setLoadingTabs(false);
    }
  };

  // Google Sheets: Test Lead Sync
  const handleTestSyncSheets = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/integrations/google/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_sync',
          test_name: 'John Doe (Test Lead)',
          test_phone: '+91 98765 43210',
          test_email: 'john.doe@example.com',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test sync failed');
      }

      toast.success(
        <div>
          <p className="font-semibold">Test Lead Synced to Google Sheets!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added to: <b>{data.sheetName}</b> ({data.updatedRange || 'Row appended'})
          </p>
          {data.spreadsheetUrl && (
            <a
              href={data.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline mt-1 inline-flex items-center gap-1"
            >
              Open in Google Sheets <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      );
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Test sync failed. Check your spreadsheet permissions.');
    } finally {
      setTesting(false);
    }
  };

  // Google Calendar: Create Test Event
  const handleTestEventCalendar = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/integrations/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_event',
          summary: 'NX CRM WhatsApp Consultation (Test)',
          description: 'Test appointment booking scheduled from NX CRM.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test event creation failed');
      }

      toast.success(
        <div>
          <p className="font-semibold">Test Appointment Scheduled!</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added to Google Calendar with Meet link.
          </p>
          {data.meetLink && (
            <p className="text-xs text-emerald-500 font-mono mt-1">Meet: {data.meetLink}</p>
          )}
          {data.eventUrl && (
            <a
              href={data.eventUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline mt-1 inline-flex items-center gap-1"
            >
              Open Event <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      );
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Calendar test event failed. Please check permissions.');
    } finally {
      setTesting(false);
    }
  };

  // Copy Apps Script template to clipboard
  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    toast.success('Google Apps Script copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Generic Save Configuration
  const handleSaveConfig = async () => {
    if (!activeModalItem) return;

    setSaving(true);
    try {
      if (activeModalItem.id === 'google_sheets' && googleAuthTab === 'oauth') {
        const res = await fetch('/api/integrations/google/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_config',
            selected_spreadsheet_id: configForm.selected_spreadsheet_id,
            selected_spreadsheet_title: configForm.selected_spreadsheet_title,
            selected_sheet_name: configForm.selected_sheet_name,
            auto_sync_leads: configForm.auto_sync_leads || 'all',
            is_enabled: isEnabled,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      } else if (activeModalItem.id === 'google_calendar' && googleAuthTab === 'oauth') {
        const res = await fetch('/api/integrations/google/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_config',
            selected_calendar_id: configForm.selected_calendar_id || 'primary',
            selected_calendar_summary: configForm.selected_calendar_summary || 'Primary Calendar',
            booking_duration_mins: configForm.booking_duration_mins || '30',
            is_enabled: isEnabled,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      } else {
        // Manual Script mode for Google Sheets / Calendar, or standard integrations
        const res = await fetch('/api/account/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integration_id: activeModalItem.id,
            is_enabled: isEnabled,
            config: {
              ...configForm,
              connection_type:
                activeModalItem.id === 'google_sheets' || activeModalItem.id === 'google_calendar'
                  ? 'manual'
                  : undefined,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to save');
      }

      toast.success(`${activeModalItem.name} configuration saved!`);
      setActiveModalItem(null);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Webhook / Manual Test Connection
  const handleTestConnection = async () => {
    if (!activeModalItem) return;

    setTesting(true);
    try {
      const res = await fetch('/api/account/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          integration_id: activeModalItem.id,
          config: configForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Connection test failed');
      }

      toast.success(data.message || 'Connection test successful!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect. Please verify your credentials or webhook URL.');
    } finally {
      setTesting(false);
    }
  };

  const filteredItems = Object.values(INTEGRATION_DEFINITIONS).filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <SettingsPanelHead
        title="Integrations & Apps"
        description="Connect Google Sheets, Google Calendar, Payment Gateways (Razorpay, PhonePe, Paytm, Stripe), Zoho Mail, and Webhooks for automated real-time workflows."
      />

      {/* Hero OAuth Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Two Ways to Connect Google Apps: 1-Click OAuth or Manual Script
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold"
                >
                  Dual Mode
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-2xl">
                Choose <b>1-Click Google Sign-In</b> for instant, secure authorization with zero API keys or scripts — or switch to <b>Manual Script</b> anytime to paste your own Google Apps Script Webhook URL and Calendar ID.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/80 border border-border/60 text-[11px] text-muted-foreground font-medium">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer',
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/20'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card border-border/80"
          />
        </div>
      </div>

      {/* Integration Cards Grid */}
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
            const savedState = integrations[item.id];
            const isGoogle = item.id === 'google_sheets' || item.id === 'google_calendar';
            const googleEmail =
              savedState?.google_account_email || savedState?.config?.google_email;

            // Dual connection detection: OAuth vs Manual Script
            const isGoogleOAuthConnected = Boolean(
              isGoogle &&
                savedState?.is_enabled &&
                (savedState?.encrypted_refresh_token || googleEmail)
            );

            const isManualConnected = Boolean(
              isGoogle &&
                savedState?.is_enabled &&
                !isGoogleOAuthConnected &&
                (savedState?.config?.webhook_url ||
                  savedState?.config?.calendar_id ||
                  savedState?.config?.booking_link)
            );

            const isConfigured = isGoogle
              ? isGoogleOAuthConnected || isManualConnected
              : Boolean(savedState?.config && Object.keys(savedState.config).length > 0);

            const isLive = isGoogle
              ? isGoogleOAuthConnected || isManualConnected
              : isConfigured && savedState?.is_enabled;

            const isConnecting = connectingService === item.id;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-xs transition-transform duration-200 group-hover:scale-105">
                        <BrandLogo id={item.id} size={44} />
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

                    {isGoogle ? (
                      isGoogleOAuthConnected ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          Google OAuth
                        </Badge>
                      ) : isManualConnected ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        >
                          Manual Script
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-semibold bg-muted text-muted-foreground border border-border/70"
                        >
                          OAuth / Script
                        </Badge>
                      )
                    ) : item.badge ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      >
                        {item.badge}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground/90 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* Connected Account Preview for Google (OAuth Mode) */}
                  {isGoogle && isGoogleOAuthConnected && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account:</span>
                        <span
                          className="font-semibold text-foreground truncate max-w-[170px]"
                          title={googleEmail}
                        >
                          {googleEmail}
                        </span>
                      </div>
                      {item.id === 'google_sheets' && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Target Sheet:</span>
                          <span
                            className="text-foreground truncate max-w-[170px]"
                            title={
                              savedState?.config?.selected_spreadsheet_title ||
                              'NX CRM - WhatsApp Leads'
                            }
                          >
                            {savedState?.config?.selected_spreadsheet_title ||
                              'NX CRM - WhatsApp Leads'}
                          </span>
                        </div>
                      )}
                      {item.id === 'google_calendar' && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Target Cal:</span>
                          <span
                            className="text-foreground truncate max-w-[170px]"
                            title={savedState?.config?.selected_calendar_summary || 'Primary'}
                          >
                            {savedState?.config?.selected_calendar_summary || 'Primary'}
                          </span>
                        </div>
                      )}
                      {savedState?.last_synced_at && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-0.5 border-t border-border/40">
                          <span>Last Synced:</span>
                          <span>
                            {new Date(savedState.last_synced_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connected Preview for Google (Manual Script Mode) */}
                  {isGoogle && isManualConnected && (
                    <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Connection:</span>
                        <span className="font-semibold text-emerald-500">Manual Script</span>
                      </div>
                      {item.id === 'google_sheets' && savedState?.config?.webhook_url && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Webhook:</span>
                          <span
                            className="text-foreground truncate max-w-[170px] font-mono text-[10px]"
                            title={savedState.config.webhook_url}
                          >
                            {savedState.config.webhook_url}
                          </span>
                        </div>
                      )}
                      {item.id === 'google_calendar' && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Calendar ID:</span>
                          <span
                            className="text-foreground truncate max-w-[170px]"
                            title={savedState?.config?.calendar_id || 'primary'}
                          >
                            {savedState?.config?.calendar_id || 'primary'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-3.5">
                  <div className="flex items-center gap-1.5">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {isGoogleOAuthConnected ? 'Connected (OAuth)' : 'Connected (Script)'}
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

                  {/* Dual Action Options for Google integrations if not connected */}
                  {isGoogle && !isGoogleOAuthConnected && !isManualConnected ? (
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenConfig(item, 'manual')}
                        className="h-8 text-xs font-medium rounded-lg px-2.5 border-border hover:bg-muted shrink-0"
                        title="Configure manually with Google Apps Script Webhook"
                      >
                        <Code2 className="size-3 mr-1 text-muted-foreground" />
                        <span>Manual Script</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleConnectGoogle(item.id as any)}
                        disabled={isConnecting}
                        className="h-8 text-xs font-semibold rounded-lg px-3 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm shrink-0"
                      >
                        {isConnecting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <GoogleIcon className="size-3.5" />
                        )}
                        <span>Connect with Google</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isLive ? 'outline' : 'default'}
                        onClick={() => handleOpenConfig(item)}
                        className="h-8 text-xs font-semibold rounded-lg px-3"
                      >
                        {isConfigured || isLive ? 'Configure' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Integration Setup Dialog */}
      {activeModalItem && (
        <Dialog open={Boolean(activeModalItem)} onOpenChange={() => setActiveModalItem(null)}>
          <DialogContent className="w-[95vw] sm:max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-xs">
                  <BrandLogo id={activeModalItem.id} size={40} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    {activeModalItem.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {activeModalItem.categoryLabel}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* DUAL MODE TAB SWITCHER FOR GOOGLE SHEETS & CALENDAR */}
              {(activeModalItem.id === 'google_sheets' ||
                activeModalItem.id === 'google_calendar') && (
                <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={() => setGoogleAuthTab('oauth')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      googleAuthTab === 'oauth'
                        ? 'bg-background text-foreground shadow-xs border border-border/80 font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <GoogleIcon className="size-3.5" />
                    <span>1-Click Google Sign-In</span>
                    {configForm.google_email && (
                      <span
                        className="size-2 rounded-full bg-emerald-500 animate-pulse"
                        title="Authorized via Google"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoogleAuthTab('manual')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      googleAuthTab === 'manual'
                        ? 'bg-background text-foreground shadow-xs border border-border/80 font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Code2 className="size-3.5 text-primary" />
                    <span>Manual Script & Credentials</span>
                    {configForm.webhook_url && (
                      <span
                        className="size-2 rounded-full bg-emerald-500"
                        title="Configured with Script"
                      />
                    )}
                  </button>
                </div>
              )}

              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/30">
                <div>
                  <div className="text-xs font-semibold text-foreground">Active Integration</div>
                  <div className="text-[11px] text-muted-foreground">
                    Enable this integration for live automations & inbox lead sync.
                  </div>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>

              {/* ======================================================== */}
              {/* OPTION 1: GOOGLE SHEETS (1-CLICK OAUTH MODE)             */}
              {/* ======================================================== */}
              {activeModalItem.id === 'google_sheets' && googleAuthTab === 'oauth' && (
                <div className="space-y-4 pt-1">
                  {configForm.google_email ? (
                    <>
                      {/* Connected Banner */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GoogleIcon className="size-4" />
                            <span className="text-xs font-semibold text-foreground">
                              Connected as:{' '}
                              <span className="text-primary">{configForm.google_email}</span>
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConnectGoogle('google_sheets')}
                            className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          >
                            <RefreshCw className="size-3" />
                            <span>Switch Account</span>
                          </Button>
                        </div>
                      </div>

                      {/* Select Spreadsheet */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">
                            Target Google Spreadsheet
                          </label>
                          {configForm.selected_spreadsheet_url && (
                            <a
                              href={configForm.selected_spreadsheet_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Open in Google Sheets <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Select
                            value={configForm.selected_spreadsheet_id || ''}
                            onValueChange={handleSelectSpreadsheet}
                            disabled={loadingSpreadsheets}
                          >
                            <SelectTrigger className="h-9 text-xs bg-background flex-1">
                              <SelectValue
                                placeholder={
                                  loadingSpreadsheets
                                    ? 'Loading spreadsheets from Google...'
                                    : configForm.selected_spreadsheet_title ||
                                      'Select a Google Spreadsheet'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {spreadsheetsList.map((sheet) => (
                                <SelectItem key={sheet.id} value={sheet.id} className="text-xs">
                                  {sheet.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCreateNewSheet}
                            disabled={creatingDefaultSheet}
                            className="h-9 text-xs font-medium shrink-0 gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                          >
                            {creatingDefaultSheet ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Plus className="size-3.5" />
                            )}
                            <span>New Sheet</span>
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">
                          Pick any existing spreadsheet from your Google Drive, or create a new
                          formatted &quot;NX CRM - WhatsApp Leads&quot; spreadsheet with 1-click.
                        </p>
                      </div>

                      {/* Select Worksheet Tab */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Worksheet Tab</label>
                        <Select
                          value={configForm.selected_sheet_name || 'WhatsApp Leads'}
                          onValueChange={(val) => handleFieldChange('selected_sheet_name', val)}
                          disabled={loadingTabs}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue
                              placeholder={
                                loadingTabs
                                  ? 'Loading worksheet tabs...'
                                  : configForm.selected_sheet_name || 'Select Tab'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sheetTabsList.length > 0 ? (
                              sheetTabsList.map((tab) => (
                                <SelectItem key={tab.title} value={tab.title} className="text-xs">
                                  {tab.title}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="WhatsApp Leads" className="text-xs">
                                WhatsApp Leads (Default)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Auto-Sync Setting */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Automatic Lead Sync Trigger
                        </label>
                        <Select
                          value={configForm.auto_sync_leads || 'all'}
                          onValueChange={(val) => handleFieldChange('auto_sync_leads', val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue placeholder="Select trigger mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">
                              Sync all new WhatsApp contacts automatically
                            </SelectItem>
                            <SelectItem value="tagged" className="text-xs">
                              Only sync qualified leads (tagged contacts)
                            </SelectItem>
                            <SelectItem value="manual" className="text-xs">
                              Manual sync from Inbox & Flow Builder only
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column Mapping Preview Table */}
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span>Column Mappings</span>
                          <span className="text-[10px] text-emerald-500 font-normal">
                            8 Columns Configured
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col A
                            </span>
                            <span className="font-semibold text-foreground">Full Name</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col B
                            </span>
                            <span className="font-semibold text-foreground">Phone Number</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col C
                            </span>
                            <span className="font-semibold text-foreground">Email Address</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col D
                            </span>
                            <span className="font-semibold text-foreground">Tags</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col E
                            </span>
                            <span className="font-semibold text-foreground">Lead Stage</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col F
                            </span>
                            <span className="font-semibold text-foreground">Source / Channel</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col G
                            </span>
                            <span className="font-semibold text-foreground">Created Date</span>
                          </div>
                          <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                            <span className="text-muted-foreground block text-[9px] uppercase">
                              Col H
                            </span>
                            <span className="font-semibold text-foreground">Last Synced</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Connect Google OAuth Prompt */
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center space-y-3.5">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <GoogleIcon className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">
                          Connect with Google Account
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                          Authorize NX CRM in 1-click. Pick spreadsheets, worksheets, and sync leads
                          without writing any code or scripts.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="default"
                        onClick={() => handleConnectGoogle('google_sheets')}
                        disabled={connectingService === 'google_sheets'}
                        className="h-10 text-xs font-semibold rounded-xl px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm"
                      >
                        {connectingService === 'google_sheets' ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <GoogleIcon className="size-4" />
                        )}
                        <span>Sign in with Google</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* OPTION 2: GOOGLE SHEETS (MANUAL SCRIPT / WEBHOOK MODE)   */}
              {/* ======================================================== */}
              {activeModalItem.id === 'google_sheets' && googleAuthTab === 'manual' && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Google Apps Script / Webhook URL</span>
                      <span className="text-[10px] text-destructive font-normal">* Required</span>
                    </label>
                    <Input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={configForm.webhook_url || ''}
                      onChange={(e) => handleFieldChange('webhook_url', e.target.value)}
                      className="h-9 text-xs bg-background font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Deploy your Google Apps Script web app with access set to &quot;Anyone&quot; and paste the URL here.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Sheet / Tab Name (Optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="WhatsApp Leads"
                      value={configForm.sheet_name || ''}
                      onChange={(e) => handleFieldChange('sheet_name', e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      The tab name inside your spreadsheet where new rows should be appended.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Auto-Sync Incoming Leads
                    </label>
                    <Select
                      value={configForm.auto_sync_leads || 'all'}
                      onValueChange={(val) => handleFieldChange('auto_sync_leads', val)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select trigger mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          Sync all new contacts automatically
                        </SelectItem>
                        <SelectItem value="tagged" className="text-xs">
                          Only qualified leads (via Flow Builder / Tags)
                        </SelectItem>
                        <SelectItem value="manual" className="text-xs">
                          Disabled (Manual / Flow trigger only)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ready-to-use Google Apps Script Template */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Code2 className="size-4 text-primary" />
                        <span>Google Apps Script Code for Your Sheet</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAppsScript}
                        className="h-7 text-[11px] gap-1 px-2.5 border-border/70"
                      >
                        {copiedScript ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copy Script</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <ol className="text-[11px] text-muted-foreground leading-relaxed list-decimal list-inside space-y-0.5">
                      <li>Open your Google Sheet → click <b>Extensions → Apps Script</b>.</li>
                      <li>Paste the code below and click <b>Deploy → New deployment</b>.</li>
                      <li>Select type <b>Web app</b>, Execute as: <b>Me</b>, Who has access: <b>Anyone</b>.</li>
                      <li>Copy the Web app URL and paste it in the field above.</li>
                    </ol>
                    <pre className="p-2.5 rounded-lg bg-background text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-36 border border-border/50">
                      {APPS_SCRIPT_TEMPLATE}
                    </pre>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* OPTION 1: GOOGLE CALENDAR (1-CLICK OAUTH MODE)           */}
              {/* ======================================================== */}
              {activeModalItem.id === 'google_calendar' && googleAuthTab === 'oauth' && (
                <div className="space-y-4 pt-1">
                  {configForm.google_email ? (
                    <>
                      {/* Connected Banner */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GoogleIcon className="size-4" />
                            <span className="text-xs font-semibold text-foreground">
                              Connected as:{' '}
                              <span className="text-primary">{configForm.google_email}</span>
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConnectGoogle('google_calendar')}
                            className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          >
                            <RefreshCw className="size-3" />
                            <span>Switch Account</span>
                          </Button>
                        </div>
                      </div>

                      {/* Select Calendar */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Target Google Calendar
                        </label>
                        <Select
                          value={configForm.selected_calendar_id || 'primary'}
                          onValueChange={(val) => {
                            const found = calendarsList.find((c) => c.id === val);
                            setConfigForm((prev) => ({
                              ...prev,
                              selected_calendar_id: val,
                              selected_calendar_summary: found?.summary || 'Primary Calendar',
                            }));
                          }}
                          disabled={loadingCalendars}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue
                              placeholder={
                                loadingCalendars
                                  ? 'Loading calendars...'
                                  : configForm.selected_calendar_summary || 'Primary Calendar'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary" className="text-xs">
                              Primary Calendar
                            </SelectItem>
                            {calendarsList
                              .filter((c) => c.id !== 'primary')
                              .map((cal) => (
                                <SelectItem key={cal.id} value={cal.id} className="text-xs">
                                  {cal.summary} {cal.timeZone ? `(${cal.timeZone})` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground/80">
                          Appointments scheduled via WhatsApp will be booked directly into this calendar.
                        </p>
                      </div>

                      {/* Meeting Duration */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Default Consultation Duration
                        </label>
                        <Select
                          value={configForm.booking_duration_mins || '30'}
                          onValueChange={(val) => handleFieldChange('booking_duration_mins', val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15" className="text-xs">
                              15 Minutes (Quick Call)
                            </SelectItem>
                            <SelectItem value="30" className="text-xs">
                              30 Minutes (Standard Consultation)
                            </SelectItem>
                            <SelectItem value="45" className="text-xs">
                              45 Minutes (Extended Demo)
                            </SelectItem>
                            <SelectItem value="60" className="text-xs">
                              60 Minutes (Full Strategy Session)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Features Info Box */}
                      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-foreground font-semibold">
                          <Video className="size-4 text-primary" />
                          <span>Google Meet Auto-Generation</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Every scheduled appointment automatically creates a secure Google Meet video
                          link and sends it to the customer via WhatsApp.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Connect Google OAuth Prompt */
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center space-y-3.5">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <GoogleIcon className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">
                          Connect with Google Calendar
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                          Authorize NX CRM to create appointments with automatic Google Meet video links
                          and send confirmations directly on WhatsApp.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="default"
                        onClick={() => handleConnectGoogle('google_calendar')}
                        disabled={connectingService === 'google_calendar'}
                        className="h-10 text-xs font-semibold rounded-xl px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm"
                      >
                        {connectingService === 'google_calendar' ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <GoogleIcon className="size-4" />
                        )}
                        <span>Sign in with Google</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* OPTION 2: GOOGLE CALENDAR (MANUAL CREDENTIALS MODE)      */}
              {/* ======================================================== */}
              {activeModalItem.id === 'google_calendar' && googleAuthTab === 'manual' && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Google Calendar ID</span>
                      <span className="text-[10px] text-destructive font-normal">* Required</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="primary or your_email@gmail.com"
                      value={configForm.calendar_id || ''}
                      onChange={(e) => handleFieldChange('calendar_id', e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Use <b>primary</b> for your main Google Calendar, or copy your Calendar ID from Google Calendar Settings → Integrate calendar.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Calendar Booking URL (Calendly or Google Calendar Schedule)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://calendar.google.com/calendar/appointments/schedules/..."
                      value={configForm.booking_link || ''}
                      onChange={(e) => handleFieldChange('booking_link', e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                      Direct booking link sent to customers via WhatsApp automated messages.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Default Meeting Duration
                    </label>
                    <Select
                      value={configForm.booking_duration_mins || '30'}
                      onValueChange={(val) => handleFieldChange('booking_duration_mins', val)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15" className="text-xs">
                          15 Minutes (Quick Call)
                        </SelectItem>
                        <SelectItem value="30" className="text-xs">
                          30 Minutes (Standard Consultation)
                        </SelectItem>
                        <SelectItem value="45" className="text-xs">
                          45 Minutes (Extended Demo)
                        </SelectItem>
                        <SelectItem value="60" className="text-xs">
                          60 Minutes (Full Strategy Session)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* OTHER INTEGRATIONS (ZOHO, RAZORPAY, STRIPE, WEBHOOKS)    */}
              {/* ======================================================== */}
              {activeModalItem.id !== 'google_sheets' &&
                activeModalItem.id !== 'google_calendar' && (
                  <>
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
                  </>
                )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 border-t border-border/60 pt-4">
              {/* FOOTER ACTIONS FOR GOOGLE SHEETS */}
              {activeModalItem.id === 'google_sheets' ? (
                googleAuthTab === 'oauth' && configForm.google_email ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestSyncSheets}
                      disabled={testing || !configForm.selected_spreadsheet_id}
                      className="h-9 text-xs font-medium gap-1.5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      {testing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      <span>Test Sync Lead</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect('google_sheets')}
                      disabled={disconnecting}
                      className="h-9 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 cursor-pointer"
                    >
                      {disconnecting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      <span>Disconnect</span>
                    </Button>
                  </div>
                ) : googleAuthTab === 'manual' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing || !configForm.webhook_url}
                    className="h-9 text-xs font-medium gap-1.5 border-border hover:bg-muted cursor-pointer"
                  >
                    {testing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5 text-primary" />
                    )}
                    <span>Test Webhook Ping</span>
                  </Button>
                ) : (
                  <div />
                )
              ) : activeModalItem.id === 'google_calendar' ? (
                /* FOOTER ACTIONS FOR GOOGLE CALENDAR */
                googleAuthTab === 'oauth' && configForm.google_email ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestEventCalendar}
                      disabled={testing}
                      className="h-9 text-xs font-medium gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                    >
                      {testing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      <span>Create Test Event</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect('google_calendar')}
                      disabled={disconnecting}
                      className="h-9 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 cursor-pointer"
                    >
                      {disconnecting ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      <span>Disconnect</span>
                    </Button>
                  </div>
                ) : googleAuthTab === 'manual' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="h-9 text-xs font-medium gap-1.5 border-border hover:bg-muted cursor-pointer"
                  >
                    {testing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5 text-primary" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                ) : (
                  <div />
                )
              ) : (
                /* Standard Webhook Test Connection */
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="h-9 text-xs font-medium gap-1.5 cursor-pointer"
                >
                  {testing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5 text-primary" />
                  )}
                  <span>Test Connection</span>
                </Button>
              )}

              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveModalItem(null)}
                  className="h-9 text-xs cursor-pointer flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer flex-1 sm:flex-initial"
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
