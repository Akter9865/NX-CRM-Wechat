import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers applied to every response.
 *
 * CSP ships as `Content-Security-Policy-Report-Only` so the browser
 * surfaces violations in the console without blocking anything — once
 * we have confidence nothing legit trips it (two deploys, a pass on
 * every route), flip the key to `Content-Security-Policy` to enforce.
 *
 * The rest of the headers are straight blocks, safe to enforce today:
 *   - HSTS: only meaningful on HTTPS (no-op on http://localhost).
 *   - X-Content-Type-Options / X-Frame-Options / Referrer-Policy:
 *     baseline OWASP hardening, no behavioural cost.
 *   - Permissions-Policy: we don't use camera / microphone / etc, so
 *     deny them. A supply-chain compromise or a forgotten plugin
 *     can't silently opt back in.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // Microphone is allowed for same-origin (`self`) so the inbox
    // composer can record voice notes via MediaRecorder. Everything
    // else stays denied — a compromised dependency can't silently grab
    // the camera / geolocation / etc.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its inline hydration script
      // and 'unsafe-eval' in dev + some production optimisations.
      // Nonce-based CSP is a later project.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind + inline style attributes on lots of components.
      "style-src 'self' 'unsafe-inline'",
      // Supabase public-bucket avatars, contact avatars (arbitrary
      // https URLs paste-able from the UI), OG images, data URLs for
      // tiny inline assets.
      "img-src 'self' data: blob: https:",
      // Outbound media previews (blob: from MediaRecorder + file picker)
      // and Supabase public-bucket audio/video the inbox renders.
      "media-src 'self' blob: https://*.supabase.co",
      "font-src 'self' data:",
      // Supabase REST + realtime (WSS). All Meta API calls happen
      // server-side, so graph.facebook.com does not belong here.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
] as const;

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the
  // Docker image can run without node_modules or the Next CLI.
  // Harmless outside Docker: `next start` keeps working as before.
  output: "standalone",

  /**
   * Cross-origin dev access (Next.js 16).
   *
   * Next 16 blocks requests to dev-only resources (`/_next/*` internals,
   * the HMR websocket, the dev overlay) unless the browser's Origin is
   * the host the dev server booted on — `localhost` by default. Tunnels
   * like ngrok serve the app from a public HTTPS host, so without
   * allow-listing that host those dev requests come back 403: HMR stops
   * working and the dev session degrades over the tunnel (issue #365).
   *
   * Wildcards match subdomains only (Next's CSRF matcher), so the
   * randomised tunnel subdomain is covered. Add any other host via
   * `ALLOWED_DEV_ORIGINS` (comma-separated). This key is dev-only and
   * has no effect on a production build.
   */
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.ngrok.io",
    "*.trycloudflare.com",
    "*.loca.lt",
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : []),
  ],

  /**
   * Version-skew protection. When DEPLOYMENT_VERSION (or the platform's
   * git SHA) is set at build time, Next tags assets with `?dpl=` and
   * compares it on client navigations, so a tab left open across a
   * deploy does one clean reload on its next navigation instead of
   * failing to load chunks mid-session.
   */
  //
  // On Vercel this is left undefined: the platform injects its own
  // deployment id for its built-in skew protection, and overriding it
  // conflicts with that.
  deploymentId: process.env.VERCEL
    ? undefined
    : process.env.DEPLOYMENT_VERSION || process.env.SOURCE_COMMIT || undefined,

  // Smaller client bundles: rewrite barrel imports of these packages to
  // per-module imports so the dashboard doesn't ship every icon/chart.
  experimental: {
    optimizePackageImports: ["recharts", "@xyflow/react", "@base-ui/react", "@dnd-kit/core"],
    // Dashboard pages fetch their data client-side, so reusing the RSC
    // shell for 30s makes switching between sidebar tabs instant
    // without serving stale data.
    staleTimes: { dynamic: 30, static: 180 },
  },

  /**
   * Cache-Control policy.
   *
   * History: a previous rule sent `public, s-maxage=300,
   * stale-while-revalidate=86400` for EVERY page, including the
   * authenticated dashboard. A shared CDN (Hostinger) then served
   * up-to-24h-stale HTML / RSC payloads that referenced chunk hashes
   * from an older deploy. The browser 404'd those chunks and Next.js
   * recovered with a hard reload — the "app reloads by itself" bug —
   * and per-user dashboard payloads were eligible for shared caching.
   *
   * Now:
   *   - /_next/static/*  — untouched (Next sets immutable for hashed assets).
   *   - /api/*           — no-store (per-user data).
   *   - /sw.js           — no-cache so service-worker updates roll out
   *                         on the next visit.
   *   - app routes       — private, no-store. Never shared-cached.
   *   - marketing pages  — public but must revalidate; no long SWR, so a
   *                         deploy is visible immediately and HTML never
   *                         outlives its chunks.
   */
  async headers() {
    const APP_ROUTES = [
      "dashboard", "inbox", "contacts", "pipelines", "broadcasts",
      "automations", "flows", "agents", "billing", "notifications",
      "tools", "settings", "bot-reply", "admin", "superadmin", "join",
      "login", "signup", "forgot-password", "reset-password", "auth",
    ];
    const noStore = [
      { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
    ];
    return [
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      ...APP_ROUTES.flatMap((r) => [
        { source: `/${r}`, headers: noStore },
        { source: `/${r}/:path*`, headers: noStore },
      ]),
      {
        source: `/:path((?!_next/static|_next/image|api|sw\\.js|${APP_ROUTES.join("|")}).*)`,
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, must-revalidate" },
        ],
      },
      {
        // Disable proxy buffering so streamed RSC / Suspense boundaries
        // reach the browser as they resolve (nginx / Hostinger proxies).
        source: "/:path*",
        headers: [...SECURITY_HEADERS, { key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
