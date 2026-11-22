'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Registers /sw.js and handles updates WITHOUT surprise reloads.
 *
 * When a new deploy ships a new worker, it installs in the background
 * and waits. We show a persistent toast; the page only reloads when the
 * user clicks "Update". (The old stub called skipWaiting() on install,
 * which swapped workers under an open session.)
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Don't run a SW in dev — it fights with HMR.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }

    let reloading = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const promptUpdate = (worker: ServiceWorker) => {
      toast('A new version of NX CRM is available', {
        id: 'sw-update',
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
        },
      });
    };

    const onControllerChange = () => {
      // Fires only after the user accepted the update (SKIP_WAITING),
      // or on the very first install (no previous controller → no reload).
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          promptUpdate(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(installing);
            }
          });
        });

        // Check for a new deploy hourly while the app stays open.
        intervalId = setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      } catch (err) {
        console.warn('[PWA] Service worker registration failed:', err);
      }
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('load', register);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}
