import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the brand mark — Hostinger
// violet rounded square + white chat-square glyph — matching the
// sidebar logo in `src/components/layout/sidebar.tsx`. Next.js renders
// this at build time and auto-injects <link rel="icon"> into <head>.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #3B82F6 100%)",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" fill="rgba(255,255,255,0.2)" />
          <path d="M8 12h.01" strokeWidth="3" />
          <path d="M12 12h.01" strokeWidth="3" />
          <path d="M16 12h.01" strokeWidth="3" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
