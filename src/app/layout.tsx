import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import { GoogleAnalyticsTracker } from "@/components/analytics/google-analytics";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nxcrm.online'),
  title: {
    default: "NX CRM — WhatsApp CRM, Automation & AI for Growing Businesses",
    template: "%s — NX CRM | Nexora Spark Agency",
  },
  description: "Next-generation enterprise CRM for WhatsApp with AI Auto-Replies, Visual Flow Builder, Multi-Agent Team Management, and Shared Inbox. Powered by Nexora Spark Agency.",
  authors: [{ name: "Nexora Spark Agency", url: "https://nexorasparkagency.com" }],
  creator: "Nexora Spark Agency",
  publisher: "Nexora Spark Agency",
  applicationName: "NX CRM Enterprise",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon" }],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark light",
};

// Inline boot script — runs before React hydrates so the user's
// chosen accent (data-theme) AND mode (data-mode) are on the <html>
// element before first paint. Without this every page load flashes
// the server-rendered defaults for a frame before the React tree
// mounts and applies the picked values.
//
// Kept dependency-free (no imports, no JSX) — must be a string the
// browser can run as a single <script>. Knowledge of valid ids is
// sourced from the THEME_IDS / MODES constants so adding one doesn't
// silently break the boot path.
const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      d.dataset.theme = savedTheme;
      if (savedTheme.charAt(0) === '#') {
        var hex = savedTheme;
        var r = parseInt(hex.slice(1,3), 16) || 16;
        var g = parseInt(hex.slice(3,5), 16) || 185;
        var b = parseInt(hex.slice(5,7), 16) || 129;
        d.style.setProperty('--primary', hex);
        d.style.setProperty('--ring', 'rgba(' + r + ',' + g + ',' + b + ',0.4)');
        d.style.setProperty('--primary-hover', 'rgba(' + r + ',' + g + ',' + b + ',0.88)');
        d.style.setProperty('--primary-soft', 'rgba(' + r + ',' + g + ',' + b + ',0.12)');
        d.style.setProperty('--primary-soft-2', 'rgba(' + r + ',' + g + ',' + b + ',0.22)');
        d.style.setProperty('--sidebar-primary', hex);
        d.style.setProperty('--chart-1', hex);
      }
    } else {
      d.dataset.theme = THEME_DEFAULT;
    }

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className={`${inter.variable} h-full antialiased`}
      // The `theme-boot` script below rewrites `data-theme` and
      // `data-mode` on <html> from localStorage before React hydrates,
      // so for any non-default choice the client DOM intentionally
      // differs from the server-rendered defaults. suppressHydration-
      // Warning silences the expected mismatch — it only applies to
      // this element's own attributes, so genuine mismatches in
      // children still surface.
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            {children}
            <ThemedToaster />
            <GoogleAnalyticsTracker />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
