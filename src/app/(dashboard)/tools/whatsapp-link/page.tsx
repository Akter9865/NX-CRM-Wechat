'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Download,
  RotateCcw,
  Sparkles,
  Smartphone,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Tag,
} from 'lucide-react';

interface WhatsAppConnection {
  id: string;
  connection_name: string;
  display_phone_number?: string;
  status?: string;
  is_default?: boolean;
}

const MESSAGE_PRESETS = [
  '👋 Hi! I would like to know more about your services.',
  '📅 Hello, I would like to schedule a product demo.',
  '💬 Hi there! I need assistance with an existing order.',
  '🏷️ Hello, are there any special discounts available today?',
];

const SOURCE_PRESETS = [
  'Website Header',
  'Instagram Bio',
  'Facebook Ad',
  'Google Campaign',
  'Email Signature',
  'Flyer QR',
];

export default function WhatsAppLinkGeneratorPage() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);

  // Form State
  const [inputMode, setInputMode] = useState<'connected' | 'manual'>('connected');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [manualPhone, setManualPhone] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');

  // Generated Link State
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Fetch authorized WhatsApp connections
  useEffect(() => {
    async function loadConnections() {
      try {
        const res = await fetch('/api/whatsapp/connections');
        if (res.ok) {
          const data = await res.json();
          const list = data.connections || [];
          setConnections(list);
          if (list.length > 0) {
            const def = list.find((c: WhatsAppConnection) => c.is_default) || list[0];
            setSelectedConnectionId(def.id);
            setInputMode('connected');
          } else {
            setInputMode('manual');
          }
        } else {
          setInputMode('manual');
        }
      } catch (err) {
        console.error('Error loading connections:', err);
      }
    }
    loadConnections();
  }, []);

  // Compute the final international phone number
  const resolveTargetNumber = (): string => {
    if (inputMode === 'connected') {
      const conn = connections.find((c) => c.id === selectedConnectionId);
      if (conn?.display_phone_number) {
        return conn.display_phone_number.replace(/\D/g, '');
      }
    }
    return formatToInternationalPhone(manualPhone, selectedCountry.dial);
  };

  const handleGenerate = async () => {
    const finalNumber = resolveTargetNumber();

    if (!finalNumber || finalNumber.length < 7) {
      toast.error('Please enter a valid phone number or select a connected WhatsApp.');
      return;
    }

    const link = buildWhatsAppLink(finalNumber, message);
    setGeneratedUrl(link);

    // Generate QR Code immediately
    try {
      const dataUrl = await QRCode.toDataURL(link, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    }

    toast.success('WhatsApp link generated successfully!');
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleOpenWhatsApp = () => {
    if (!generatedUrl) return;
    window.open(generatedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `whatsapp-qr-${resolveTargetNumber() || 'chat'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('QR Code downloaded!');
  };

  const handleReset = () => {
    if (connections.length > 0) {
      setInputMode('connected');
      setSelectedConnectionId(connections[0].id);
    } else {
      setInputMode('manual');
    }
    setManualPhone('');
    setMessage('');
    setSource('');
    setGeneratedUrl('');
    setQrDataUrl(null);
    setCopied(false);
    toast.info('Form cleared.');
  };

  const activeNumberDisplay = resolveTargetNumber();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="size-3" />
              <span>Free CRM Tool</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            WhatsApp Link Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a direct WhatsApp click-to-chat link with a customized pre-filled message and downloadable QR code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tools">
            <Button variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground hover:bg-muted">
              All Tools
            </Button>
          </Link>
          <Link href="/tools/whatsapp-button">
            <Button size="sm" className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-xs">
              Button Generator &rarr;
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Preview / Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            {/* Mode Switcher */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                1. WhatsApp Number Source
              </Label>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/60 border border-border/60">
                <button
                  type="button"
                  onClick={() => setInputMode('connected')}
                  disabled={connections.length === 0}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    inputMode === 'connected'
                      ? 'bg-card text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground disabled:opacity-40'
                  }`}
                >
                  <Smartphone className="size-3.5" />
                  <span>Connected Numbers ({connections.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    inputMode === 'manual'
                      ? 'bg-card text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="size-3.5" />
                  <span>Manual Phone Input</span>
                </button>
              </div>
            </div>

            {/* Input by Mode */}
            {inputMode === 'connected' && (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <Label className="text-xs font-medium text-foreground">
                  Select Connected WhatsApp Account
                </Label>
                {connections.length > 0 ? (
                  <Select
                    value={selectedConnectionId}
                    onValueChange={(val) => {
                      if (val) setSelectedConnectionId(val);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30">
                      <SelectValue placeholder="Select connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-medium text-foreground">{conn.connection_name}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {conn.display_phone_number || 'Connected API'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
                    No WhatsApp Cloud API connections found. Switch to manual number entry below.
                  </div>
                )}
              </div>
            )}

            {inputMode === 'manual' && (
              <div className="space-y-3 animate-in fade-in-50 duration-200">
                <Label className="text-xs font-medium text-foreground">
                  Enter Country & Phone Number
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <Select
                      value={selectedCountry.code}
                      onValueChange={(code) => {
                        if (!code) return;
                        const c = COUNTRY_CODES.find((item) => item.code === code);
                        if (c) setSelectedCountry(c);
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {COUNTRY_CODES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span>{country.flag}</span>
                              <span className="font-medium">{country.name}</span>
                              <span className="text-muted-foreground font-mono text-xs">
                                +{country.dial}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-7">
                    <Input
                      type="tel"
                      placeholder={`e.g. ${selectedCountry.format}`}
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="h-11 rounded-xl border-border bg-muted/30 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pre-filled Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  2. Pre-filled Message (Optional)
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {message.length} / 1000
                </span>
              </div>

              <Textarea
                placeholder="Type the message that contacts will automatically see in their WhatsApp chat box..."
                value={message}
                maxLength={1000}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="rounded-xl border-border bg-muted/30 text-sm resize-none focus-visible:ring-primary/20"
              />

              {/* Preset message chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Message Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(preset)}
                      className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign / Source Tag (Optional) */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  3. Campaign / Placement Source (Optional)
                </Label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SOURCE_PRESETS.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSource(src)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                      source === src
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={handleGenerate}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <LinkIcon className="size-4 mr-1.5" />
                <span>Generate WhatsApp Link</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-11 rounded-xl border-border text-muted-foreground hover:bg-muted"
                title="Reset Form"
              >
                <RotateCcw className="size-4 mr-1" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mockup & Generated Output (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Generated Result Card */}
          {generatedUrl ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5 space-y-5 animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="size-4" />
                  Your WhatsApp Link is Ready
                </span>
                {source && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400">
                    {source}
                  </span>
                )}
              </div>

              {/* URL Box */}
              <div className="space-y-1.5">
                <div className="rounded-xl border border-border bg-background p-3 font-mono text-xs text-foreground break-all select-all shadow-inner">
                  {generatedUrl}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleCopy}
                  className={`h-10 rounded-xl font-semibold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="size-4 mr-1.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-1.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleOpenWhatsApp}
                  variant="outline"
                  className="h-10 rounded-xl border-border text-foreground hover:bg-muted font-semibold"
                >
                  <ExternalLink className="size-4 mr-1.5 text-emerald-400" />
                  <span>Open WhatsApp</span>
                </Button>
              </div>

              {/* QR Code Section */}
              {qrDataUrl && (
                <div className="rounded-xl border border-border/80 bg-background/80 p-4 flex flex-col items-center space-y-3">
                  <div className="text-center">
                    <span className="text-xs font-bold text-foreground">Scan QR to Chat</span>
                    <p className="text-[10px] text-muted-foreground">Point any phone camera to start a WhatsApp chat</p>
                  </div>

                  <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="WhatsApp Chat QR Code"
                      className="w-48 h-48 object-contain rounded"
                    />
                  </div>

                  <Button
                    onClick={handleDownloadQr}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-lg border-border text-xs text-foreground hover:bg-muted font-medium"
                  >
                    <Download className="size-3.5 mr-1.5 text-primary" />
                    <span>Download QR Code (PNG)</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <LinkIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Generated Link & QR Code</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Configure your WhatsApp number and optional message on the left, then click <strong>Generate WhatsApp Link</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Live WhatsApp Chat Mockup */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-3">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="size-4 text-emerald-400" />
                Live WhatsApp Chat Preview
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Click-to-Chat</span>
            </div>

            {/* Phone Screen Mockup */}
            <div className="rounded-xl border border-border/80 bg-slate-900 overflow-hidden shadow-inner text-white">
              {/* WhatsApp App Bar */}
              <div className="bg-emerald-800 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-[10px] text-emerald-200">
                    WA
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs flex items-center gap-1">
                      <span>{activeNumberDisplay ? `+${activeNumberDisplay}` : 'Your Business'}</span>
                      <ShieldCheck className="size-3 text-teal-300" />
                    </div>
                    <span className="text-[9px] text-emerald-200">Official WhatsApp Business</span>
                  </div>
                </div>
              </div>

              {/* Chat Canvas */}
              <div
                className="p-4 min-h-36 flex flex-col justify-end space-y-2"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Pre-filled Outbound Bubble */}
                <div className="self-end max-w-[85%] rounded-2xl rounded-tr-xs bg-emerald-700/90 text-white p-3 text-xs shadow-md space-y-1">
                  <p className="leading-relaxed">
                    {message.trim() || 'Hi! I would like to chat with your team on WhatsApp.'}
                  </p>
                  <div className="text-[9px] text-emerald-200 text-right font-mono">
                    Just now • ✓✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
