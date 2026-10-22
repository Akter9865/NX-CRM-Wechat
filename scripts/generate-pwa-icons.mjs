import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function createSvg(size, isMaskable = false) {
  const padding = isMaskable ? Math.round(size * 0.15) : Math.round(size * 0.08);
  const innerSize = size - padding * 2;
  const radius = isMaskable ? 0 : Math.round(innerSize * 0.22);
  const iconPadding = Math.round(innerSize * 0.2);
  const iconSize = innerSize - iconPadding * 2;

  // Background rect: For maskable, full bleed background so Android mask doesn't show white gaps
  const bgRect = isMaskable
    ? `<rect width="${size}" height="${size}" fill="url(#bgGrad)" />`
    : `<rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${radius}" fill="url(#bgGrad)" filter="url(#shadow)" />`;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="50%" stop-color="#06B6D4" />
        <stop offset="100%" stop-color="#3B82F6" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${Math.round(size * 0.02)}" stdDeviation="${Math.round(size * 0.03)}" flood-color="#10B981" flood-opacity="0.35"/>
      </filter>
      <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#F0FDF4" />
      </linearGradient>
    </defs>
    ${bgRect}
    <g transform="translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2}) scale(${iconSize / 24})">
      <!-- WhatsApp / NX Chat Bubble -->
      <path
        d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"
        fill="rgba(255, 255, 255, 0.22)"
        stroke="#ffffff"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Active Signal Dots -->
      <circle cx="8" cy="12" r="1.3" fill="#ffffff" />
      <circle cx="12" cy="12" r="1.3" fill="#ffffff" />
      <circle cx="16" cy="12" r="1.3" fill="#ffffff" />
      <!-- Automation Sparkle / Lightning Accents -->
      <path
        d="M17 5L19 2L21 5L24 7L21 9L19 12L17 9L14 7Z"
        fill="#ffffff"
        opacity="0.9"
        transform="scale(0.4) translate(14, 2)"
      />
    </g>
  </svg>
  `.trim();
}

async function generate() {
  const targets = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'icon-384x384.png', size: 384, maskable: false },
    { name: 'icon-144x144.png', size: 144, maskable: false },
    { name: 'icon-96x96.png', size: 96, maskable: false },
    { name: 'icon-72x72.png', size: 72, maskable: false },
    { name: 'icon-48x48.png', size: 48, maskable: false },
  ];

  for (const t of targets) {
    const svg = Buffer.from(createSvg(t.size, t.maskable));
    const dest = path.join(outDir, t.name);
    await sharp(svg)
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log(`Generated: ${dest} (${t.size}x${t.size})`);
  }
}

generate().catch(console.error);
