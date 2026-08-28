'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Laptop, Check, Share, PlusSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error iOS Safari standalone check
        Boolean(window.navigator?.standalone);
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('NX CRM installed successfully on your device!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (isStandalone) {
      toast.info('NX CRM is already installed on this device.');
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          toast.success('Installing NX CRM App...');
        }
      } catch (err) {
        console.error('Error triggering PWA install:', err);
      }
      return;
    }

    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    // Generic fallback for desktop / chrome when prompt event is already captured or needs browser menu
    toast.info(
      'To install, click the Install icon (⬇) in your browser address bar or menu.',
      { duration: 5000 }
    );
  };

  return {
    isInstallable: isInstallable || (!isStandalone && isIos),
    isStandalone,
    isIos,
    showIosGuide,
    setShowIosGuide,
    triggerInstall,
  };
}

export function PwaInstallButton({
  variant = 'outline',
  size = 'sm',
  className,
  showLabel = true,
  label = 'Install App',
}: {
  variant?: 'outline' | 'default' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
  label?: string;
}) {
  const { isStandalone, showIosGuide, setShowIosGuide, triggerInstall } = usePwaInstall();

  // If already running as an installed desktop/mobile app, render nothing or small badge
  if (isStandalone) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={triggerInstall}
        title="Install NX CRM as Desktop/Mobile App (Add to Home Screen)"
        className={cn(
          'gap-1.5 transition-all shadow-2xs font-semibold',
          className
        )}
      >
        <Download className="size-3.5 shrink-0 animate-bounce text-emerald-500" />
        {showLabel && <span>{label}</span>}
      </Button>

      {/* iOS Add to Home Screen Instructions Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Smartphone className="size-5 text-primary" />
              <span>Add NX CRM to Home Screen</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these simple steps in Safari to install NX CRM on your iPhone or iPad:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Tap the Share Button <Share className="size-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  At the bottom of your Safari browser bar, tap the Share icon.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot; <PlusSquare className="size-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Scroll down the share menu and tap &quot;Add to Home Screen&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Tap &quot;Add&quot; in Top Right <Check className="size-3.5 text-emerald-500 inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  NX CRM icon will appear on your Home Screen for instant 1-tap access!
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PwaInstallBanner({ className }: { className?: string }) {
  const { isStandalone, triggerInstall, showIosGuide, setShowIosGuide } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-xs backdrop-blur-md',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-xs">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Install NX CRM App</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                1-Click Add to Home Screen
              </span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access your WhatsApp CRM inbox, real-time message notifications, and automations faster with our standalone app.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            size="sm"
            onClick={triggerInstall}
            className="h-8.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            Install App
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* iOS Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Smartphone className="size-5 text-primary" />
              <span>Add NX CRM to Home Screen</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these simple steps in Safari to install NX CRM on your iPhone or iPad:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Tap the Share Button <Share className="size-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  At the bottom of your Safari browser bar, tap the Share icon.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot; <PlusSquare className="size-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Scroll down the share menu and tap &quot;Add to Home Screen&quot;.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  Tap &quot;Add&quot; in Top Right <Check className="size-3.5 text-emerald-500 inline" />
                </p>
                <p className="text-muted-foreground mt-0.5">
                  NX CRM icon will appear on your Home Screen for instant 1-tap access!
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
