'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  COUNTRY_CODES,
  CountryCode,
  formatToInternationalPhone,
  buildWhatsAppLink,
} from '@/lib/tools/phone-countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Sparkles,
  Smartphone,
  Phone,
  Copy,
  Check,
  Code2,
  Eye,
  RotateCcw,
  Palette,
  MessageCircle,
} from 'lucide-react';

interface WhatsAppConnection {
  id: string;
  connection_name: string;
  display_phone_number?: string;
  status?: string;
  is_default?: boolean;
}

const BUTTON_TEXT_PRESETS = [
  'Chat with us',
  'WhatsApp Us',
  'Message Support',
  'Talk to Sales',
  'Need Help?',
];

const COLOR_PRESETS = [
  { name: 'WhatsApp Green', hex: '#25D366', text: '#ffffff' },
  { name: 'NX Emerald', hex: '#10b981', text: '#ffffff' },
  { name: 'Midnight Slate', hex: '#0f172a', text: '#ffffff' },
  { name: 'Royal Blue', hex: '#2563eb', text: '#ffffff' },
];

export default function WhatsAppButtonGeneratorPage() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);

  // Number selection
  const [inputMode, setInputMode] = useState<'connected' | 'manual'>('connected');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [manualPhone, setManualPhone] = useState('');
  const [message, setMessage] = useState('Hi, I would like to know more about your services.');

  // Customization Settings
  const [buttonText, setButtonText] = useState('Chat with us');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [style, setStyle] = useState<'pill' | 'round' | 'inline'>('pill');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showIcon, setShowIcon] = useState(true);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].hex);
  const [showGreetingTooltip, setShowGreetingTooltip] = useState(true);
  const [greetingText, setGreetingText] = useState('👋 Need help? Chat with our team!');

  // Code Copy State
  const [copiedCodeTab, setCopiedCodeTab] = useState<string | null>(null);

  // Fetch authorized WhatsApp connections
  useEffect(() => {
    async function loadConnections() {
      try {
        const res = await fetch('/api/whatsapp/connections');
        const data = await res.json();
        if (Array.isArray(data?.connections)) {
          setConnections(data.connections);
          const defaultConn = data.connections.find((c: WhatsAppConnection) => c.is_default) || data.connections[0];
          if (defaultConn) {
            setSelectedConnectionId(defaultConn.id);
          }
        }
      } catch (err) {
        console.error('Error loading connections:', err);
        setInputMode('manual');
      }
    }
    loadConnections();
  }, []);

  const resolveTargetNumber = useCallback((): string => {
    if (inputMode === 'connected') {
      const conn = connections.find((c) => c.id === selectedConnectionId);
      if (conn?.display_phone_number) {
        return conn.display_phone_number.replace(/\D/g, '');
      }
    }
    return formatToInternationalPhone(manualPhone, selectedCountry.dial);
  }, [inputMode, connections, selectedConnectionId, manualPhone, selectedCountry.dial]);

  const finalWhatsAppUrl = useMemo(() => {
    const finalNumber = resolveTargetNumber();
    return buildWhatsAppLink(finalNumber || '919876543210', message);
  }, [resolveTargetNumber, message]);

  // Size attributes
  const sizeStyles = {
    sm: { padding: '8px 14px', fontSize: '13px', iconSize: '16px' },
    md: { padding: '12px 20px', fontSize: '15px', iconSize: '20px' },
    lg: { padding: '15px 26px', fontSize: '17px', iconSize: '24px' },
  };

  // Embed Snippet A: Vanilla HTML Floating Widget
  const floatingHtmlSnippet = useMemo(() => {
    const posCss = position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;';
    const isRound = style === 'round';
    const isInline = style === 'inline';

    return `<!-- WhatsApp Chat Widget by NX CRM -->
<div id="nx-whatsapp-widget" style="${
  isInline
    ? 'display: inline-block;'
    : `position: fixed; bottom: 24px; ${posCss} z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
}">
  ${
    showGreetingTooltip && !isRound && !isInline
      ? `<div style="margin-bottom: 8px; background: #ffffff; color: #1e293b; padding: 8px 14px; border-radius: 12px; font-size: 12px; font-weight: 500; box-shadow: 0 4px 14px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; display: inline-block;">
    ${greetingText}
  </div>\n  `
      : ''
  }<a href="${finalWhatsAppUrl}"
     target="_blank"
     rel="noopener noreferrer"
     aria-label="Chat on WhatsApp"
     style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; background-color: ${selectedColor}; color: #ffffff; text-decoration: none; font-weight: 600; ${
       isRound
         ? 'width: 56px; height: 56px; border-radius: 50%;'
         : 'border-radius: 9999px; padding: 12px 22px; font-size: 15px;'
     } box-shadow: 0 6px 20px rgba(0,0,0,0.18); transition: transform 0.2s ease, box-shadow 0.2s ease;"
     onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.25)';"
     onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.18)';">
    ${
      showIcon
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: currentColor; stroke: none;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
        : ''
    }
    ${!isRound ? `<span>${buttonText}</span>` : ''}
  </a>
</div>`;
  }, [position, style, showGreetingTooltip, greetingText, finalWhatsAppUrl, selectedColor, showIcon, buttonText]);

  // Embed Snippet B: React / Next.js Component
  const reactSnippet = useMemo(() => {
    return `import React from 'react';

export function WhatsAppButton() {
  return (
    <a
      href="${finalWhatsAppUrl}"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 ${
        position === 'bottom-right' ? 'right-6' : 'left-6'
      } z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold text-white shadow-xl hover:scale-105 transition-all"
      style={{ backgroundColor: '${selectedColor}' }}
    >
      ${showIcon ? `<span>💬</span>` : ''}
      <span>${buttonText}</span>
    </a>
  );
}`;
  }, [finalWhatsAppUrl, position, selectedColor, showIcon, buttonText]);

  const copyCodeToClipboard = async (code: string, tabName: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedCodeTab(tabName);
      toast.success(`${tabName} code copied to clipboard!`);
      setTimeout(() => setCopiedCodeTab(null), 2500);
    } catch {
      toast.error('Failed to copy code.');
    }
  };

  const handleReset = () => {
    setButtonText('Chat with us');
    setPosition('bottom-right');
    setStyle('pill');
    setSize('md');
    setShowIcon(true);
    setSelectedColor(COLOR_PRESETS[0].hex);
    setShowGreetingTooltip(true);
    setGreetingText('👋 Need help? Chat with our team!');
    toast.info('Button settings reset to defaults.');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="size-3" />
              <span>Free Website Widget</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            WhatsApp Button Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design a custom WhatsApp chat button for your website with real-time live preview and copy-paste embed code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tools">
            <Button variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground hover:bg-muted">
              All Tools
            </Button>
          </Link>
          <Link href="/tools/whatsapp-link">
            <Button size="sm" className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs">
              Link Generator &rarr;
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Button Settings (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Palette className="size-4 text-emerald-400" />
                Button Customizer
              </h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* 1. Target WhatsApp Number */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                1. WhatsApp Destination
              </Label>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60 border border-border/60">
                <button
                  type="button"
                  onClick={() => setInputMode('connected')}
                  disabled={connections.length === 0}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    inputMode === 'connected'
                      ? 'bg-card text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground disabled:opacity-40'
                  }`}
                >
                  <Smartphone className="size-3.5" />
                  <span>Connected ({connections.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    inputMode === 'manual'
                      ? 'bg-card text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="size-3.5" />
                  <span>Manual Number</span>
                </button>
              </div>

              {inputMode === 'connected' && connections.length > 0 ? (
                <Select
                  value={selectedConnectionId}
                  onValueChange={(val) => {
                    if (val) setSelectedConnectionId(val);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border bg-muted/30">
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.connection_name} ({conn.display_phone_number || 'API'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : inputMode === 'manual' ? (
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Select
                      value={selectedCountry.code}
                      onValueChange={(code) => {
                        if (!code) return;
                        const c = COUNTRY_CODES.find((item) => item.code === code);
                        if (c) setSelectedCountry(c);
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-border bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRY_CODES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} +{country.dial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-7">
                    <Input
                      type="tel"
                      placeholder={`e.g. ${selectedCountry.format}`}
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="h-10 rounded-xl border-border bg-muted/30 font-mono text-sm"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* 2. Button Text & Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                2. Button Label
              </Label>
              <Input
                type="text"
                placeholder="Button text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/30 text-sm"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {BUTTON_TEXT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setButtonText(preset)}
                    className="rounded-lg border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Pre-filled Message */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                3. Pre-filled Chat Message
              </Label>
              <Input
                type="text"
                placeholder="Message that will be pre-filled when user taps button"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/30 text-sm"
              />
            </div>

            {/* 4. Position & Style */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Position
                </Label>
                <Select
                  value={position}
                  onValueChange={(val) => {
                    if (val) setPosition(val as 'bottom-right' | 'bottom-left');
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Button Style
                </Label>
                <Select
                  value={style}
                  onValueChange={(val) => {
                    if (val) setStyle(val as 'pill' | 'round' | 'inline');
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pill">Floating Pill (Icon + Text)</SelectItem>
                    <SelectItem value="round">Floating Circle (Icon Only)</SelectItem>
                    <SelectItem value="inline">Inline Web Button</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 5. Colors & Icon Toggle */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Theme Color
              </Label>
              <div className="flex items-center gap-3">
                {COLOR_PRESETS.map((color, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedColor === color.hex
                        ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                        : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <span
                      className="size-3.5 rounded-full shrink-0 shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={showIcon}
                    onCheckedChange={(c) => setShowIcon(Boolean(c))}
                  />
                  <span className="text-xs font-medium text-foreground">
                    Display WhatsApp Icon
                  </span>
                </label>

                {style !== 'round' && style !== 'inline' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={showGreetingTooltip}
                      onCheckedChange={(c) => setShowGreetingTooltip(Boolean(c))}
                    />
                    <span className="text-xs font-medium text-foreground">
                      Display Welcome Callout Tooltip
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mockup & Embed Code (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Live Website Mockup Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-3">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Eye className="size-4 text-emerald-400" />
                Live Website Mockup
              </span>
              <span className="text-[10px] text-muted-foreground">Click button to test</span>
            </div>

            {/* Browser Preview Window */}
            <div className="relative rounded-xl border border-border/80 bg-slate-950 overflow-hidden shadow-xl text-slate-100 min-h-[300px] flex flex-col justify-between select-none">
              {/* Browser Bar */}
              <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/80 inline-block" />
                  <span className="size-2.5 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="size-2.5 rounded-full bg-green-500/80 inline-block" />
                </div>
                <div className="bg-slate-800/80 px-3 py-0.5 rounded-md text-[10px] text-slate-300 font-mono">
                  https://yourwebsite.com
                </div>
                <div className="w-8" />
              </div>

              {/* Sample Website Content */}
              <div className="p-6 space-y-3">
                <div className="h-4 w-28 bg-emerald-500/20 rounded-md" />
                <div className="h-6 w-56 bg-slate-800 rounded-md font-bold text-xs flex items-center px-2 text-slate-300">
                  Modern WhatsApp CRM Platform
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full bg-slate-800/60 rounded" />
                  <div className="h-2.5 w-4/5 bg-slate-800/60 rounded" />
                </div>
                <div className="pt-2 flex gap-2">
                  <div className="h-7 w-20 bg-emerald-600/30 rounded-lg" />
                  <div className="h-7 w-20 bg-slate-800 rounded-lg" />
                </div>
              </div>

              {/* Mockup Button Render */}
              <div
                className={`p-4 flex flex-col ${
                  position === 'bottom-right'
                    ? 'items-end'
                    : 'items-start'
                } z-10`}
              >
                {showGreetingTooltip && style !== 'round' && style !== 'inline' && (
                  <div className="mb-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg animate-bounce">
                    {greetingText}
                  </div>
                )}

                <a
                  href={finalWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 font-bold text-white shadow-xl transition-all duration-200 hover:scale-105 ${
                    style === 'round'
                      ? 'w-12 h-12 rounded-full'
                      : 'rounded-full'
                  }`}
                  style={{
                    backgroundColor: selectedColor,
                    ...(style !== 'round'
                      ? { padding: sizeStyles[size].padding, fontSize: sizeStyles[size].fontSize }
                      : {}),
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(finalWhatsAppUrl, '_blank');
                  }}
                >
                  {showIcon && (
                    <MessageCircle className="size-4.5 fill-white/20 text-white" />
                  )}
                  {style !== 'round' && <span>{buttonText}</span>}
                </a>
              </div>
            </div>
          </div>

          {/* Embed Code Output Panel */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-3">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Code2 className="size-4 text-emerald-400" />
                Website Embed Code
              </span>
              <span className="text-[10px] text-muted-foreground">Ready to copy & paste</span>
            </div>

            <Tabs defaultValue="html" className="w-full">
              <TabsList className="grid grid-cols-2 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="html" className="text-xs rounded-lg">
                  HTML / Website Widget
                </TabsTrigger>
                <TabsTrigger value="react" className="text-xs rounded-lg">
                  React / Next.js JSX
                </TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-3 pt-3">
                <div className="relative rounded-xl border border-border bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-300 max-h-48 overflow-y-auto leading-relaxed select-all">
                  <pre className="whitespace-pre-wrap break-all">{floatingHtmlSnippet}</pre>
                </div>

                <Button
                  onClick={() => copyCodeToClipboard(floatingHtmlSnippet, 'HTML Widget')}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  {copiedCodeTab === 'HTML Widget' ? (
                    <>
                      <Check className="size-4 mr-1.5" />
                      <span>Code Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-1.5" />
                      <span>Copy HTML Widget Code</span>
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="react" className="space-y-3 pt-3">
                <div className="relative rounded-xl border border-border bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-300 max-h-48 overflow-y-auto leading-relaxed select-all">
                  <pre className="whitespace-pre-wrap break-all">{reactSnippet}</pre>
                </div>

                <Button
                  onClick={() => copyCodeToClipboard(reactSnippet, 'React JSX')}
                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs"
                >
                  {copiedCodeTab === 'React JSX' ? (
                    <>
                      <Check className="size-4 mr-1.5" />
                      <span>JSX Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-1.5" />
                      <span>Copy React / Next.js Component</span>
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
