'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { initFirebaseAnalytics } from '@/lib/firebase/client';

export function GoogleAnalyticsTracker() {
  useEffect(() => {
    // Initialize Firebase client analytics in browser
    void initFirebaseAnalytics();
  }, []);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-BPCNRD7STJ"
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BPCNRD7STJ', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
