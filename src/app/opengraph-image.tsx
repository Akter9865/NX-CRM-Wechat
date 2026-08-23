import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'NX CRM — WhatsApp CRM, Automation & AI for Growing Businesses';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* Glow Ring */}
        <div
          style={{
            position: 'absolute',
            width: '600px',
            height: '400px',
            background: 'rgba(37, 99, 235, 0.25)',
            filter: 'blur(120px)',
            borderRadius: '50%',
            top: '10%',
            left: '25%',
          }}
        />

        {/* Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
              padding: '12px 28px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '24px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '22px',
              }}
            >
              NX
            </div>
            <span
              style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: '800',
                letterSpacing: '-0.5px',
              }}
            >
              NX CRM
            </span>
            <span
              style={{
                color: '#34D399',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              WhatsApp
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: '52px',
              fontWeight: '900',
              color: '#ffffff',
              lineHeight: 1.15,
              margin: '0 0 20px 0',
              maxWidth: '950px',
              letterSpacing: '-1px',
            }}
          >
            Turn WhatsApp Conversations Into Business Growth
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: '24px',
              color: '#94A3B8',
              margin: '0 0 40px 0',
              maxWidth: '800px',
              lineHeight: 1.4,
            }}
          >
            WhatsApp Cloud CRM • Shared Inbox • Visual Automations • AI Agents
          </p>

          {/* Footer Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#64748B',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            <span>Powered by Nexora Spark Agency</span>
            <span>•</span>
            <span style={{ color: '#60A5FA' }}>https://nxcrm.online</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
