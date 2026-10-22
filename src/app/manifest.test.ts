import { describe, it, expect } from 'vitest';
import manifest from './manifest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest & Asset Integrity', () => {
  const m = manifest();

  it('declares standalone display and valid start_url', () => {
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/dashboard');
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
  });

  it('declares valid 192x192 and 512x512 icons matching Chrome PWA standards', () => {
    expect(m.icons).toBeDefined();
    expect(m.icons?.length).toBeGreaterThanOrEqual(2);

    const icon192 = m.icons?.find((i) => i.sizes === '192x192' && i.purpose === 'any');
    const icon192Maskable = m.icons?.find((i) => i.sizes === '192x192' && i.purpose === 'maskable');
    const icon512 = m.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'any');
    const icon512Maskable = m.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon192Maskable).toBeDefined();
    expect(icon512).toBeDefined();
    expect(icon512Maskable).toBeDefined();
  });

  it('has physical icon files on disk in public/icons', () => {
    const requiredFiles = [
      'icon-192x192.png',
      'icon-512x512.png',
      'icon-maskable-192x192.png',
      'icon-maskable-512x512.png',
      'apple-touch-icon.png',
    ];

    for (const file of requiredFiles) {
      const fullPath = path.resolve('public/icons', file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);
    }
  });

  it('has public/sw.js and public/manifest.json available', () => {
    expect(fs.existsSync(path.resolve('public/sw.js'))).toBe(true);
    expect(fs.existsSync(path.resolve('public/manifest.json'))).toBe(true);
  });
});
