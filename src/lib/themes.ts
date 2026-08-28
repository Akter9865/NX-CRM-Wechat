/**
 * Single source of truth for the NX CRM Curated Color Theme System.
 *
 * Provides a clean, hand-crafted selection of 18 premium themes:
 * - Modern SaaS (Stripe, Linear, Supabase, Tailwind, Intercom, Emerald)
 * - Stealth & Luxury (Obsidian, Sapphire, Gold, Ruby, Amethyst)
 * - Vibrant Neon (Cyan, Electric Blue, Violet, Magenta, Lime)
 * - Warm & Nature (Amazon Forest, HubSpot Sunset, Sahara Gold, Arctic Glacier)
 * Plus dynamic custom brand hex color studio!
 */

export type ThemeCategory =
  | 'all'
  | 'saas'
  | 'luxury'
  | 'vibrant'
  | 'nature';

export interface ThemeCategoryMeta {
  id: ThemeCategory;
  label: string;
  icon?: string;
}

export const THEME_CATEGORIES: ThemeCategoryMeta[] = [
  { id: 'all', label: 'All Themes' },
  { id: 'saas', label: '💼 Modern SaaS' },
  { id: 'luxury', label: '💎 Stealth & Luxury' },
  { id: 'vibrant', label: '⚡ Vibrant Neon' },
  { id: 'nature', label: '🌲 Warm & Nature' },
];

export interface ThemeMeta {
  id: string;
  name: string;
  category: ThemeCategory;
  tagline: string;
  swatch: string; // CSS color string
  hex: string;
}

export const DEFAULT_THEME = 'emerald';
export const STORAGE_KEY = 'wacrm.theme';
export const CUSTOM_COLOR_KEY = 'wacrm.custom_color';

export const MODES = ['light', 'dark'] as const;
export type Mode = (typeof MODES)[number];
export const DEFAULT_MODE: Mode = 'dark';
export const MODE_STORAGE_KEY = 'wacrm.mode';

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODES as ReadonlyArray<string>).includes(value);
}

// ------------------------------------------------------------
// Curated Presets
// ------------------------------------------------------------

const SAAS_THEMES: ThemeMeta[] = [
  { id: 'emerald', name: 'WhatsApp Emerald', category: 'saas', tagline: 'Official WhatsApp Business signature emerald.', swatch: '#10B981', hex: '#10B981' },
  { id: 'saas_stripe', name: 'Stripe Indigo', category: 'saas', tagline: 'Fintech precision royal slate indigo.', swatch: '#635BFF', hex: '#635BFF' },
  { id: 'saas_linear', name: 'Linear Violet', category: 'saas', tagline: 'Sleek product management purple.', swatch: '#5E6AD2', hex: '#5E6AD2' },
  { id: 'saas_supabase', name: 'Supabase Green', category: 'saas', tagline: 'Developer-first high-speed Postgres green.', swatch: '#3ECF8E', hex: '#3ECF8E' },
  { id: 'saas_tailwind', name: 'Tailwind Sky Cyan', category: 'saas', tagline: 'Utility-first modern frontend cyan.', swatch: '#0EA5E9', hex: '#0EA5E9' },
  { id: 'saas_intercom', name: 'Intercom Teal', category: 'saas', tagline: 'Customer messenger conversational teal.', swatch: '#00D1C1', hex: '#00D1C1' },
];

const LUXURY_THEMES: ThemeMeta[] = [
  { id: 'luxury_obsidian', name: 'Midnight Obsidian', category: 'luxury', tagline: 'Stealth luxury dark slate mirror.', swatch: '#334155', hex: '#334155' },
  { id: 'luxury_sapphire', name: 'Kashmir Sapphire', category: 'luxury', tagline: 'Aristocratic deep oceanic cobalt.', swatch: '#1D4ED8', hex: '#1D4ED8' },
  { id: 'luxury_gold', name: 'Champagne Gold', category: 'luxury', tagline: 'Opulent metallic champagne gold.', swatch: '#CA8A04', hex: '#CA8A04' },
  { id: 'luxury_ruby', name: 'Burmese Ruby', category: 'luxury', tagline: 'Flawless regal crimson deep wine.', swatch: '#DC2626', hex: '#DC2626' },
  { id: 'luxury_amethyst', name: 'Royal Amethyst', category: 'luxury', tagline: 'Monarch violet velvet crystal.', swatch: '#7E22CE', hex: '#7E22CE' },
];

const VIBRANT_THEMES: ThemeMeta[] = [
  { id: 'neon_cyan', name: 'Cyberpunk Aqua', category: 'vibrant', tagline: 'Electric neon glow for futuristic tech.', swatch: '#06B6D4', hex: '#06B6D4' },
  { id: 'neon_electric_blue', name: 'Electric Laser Blue', category: 'vibrant', tagline: 'High-voltage radiant cobalt blue.', swatch: '#3B82F6', hex: '#3B82F6' },
  { id: 'neon_purple', name: 'Vaporwave Purple', category: 'vibrant', tagline: 'Retro 80s arcade ultraviolet neon.', swatch: '#8B5CF6', hex: '#8B5CF6' },
  { id: 'neon_magenta', name: 'Plasma Pink', category: 'vibrant', tagline: 'Vivid futuristic high-contrast magenta.', swatch: '#EC4899', hex: '#EC4899' },
  { id: 'neon_lime', name: 'Aurora Lime', category: 'vibrant', tagline: 'Ultra-bright radioactive lime green.', swatch: '#84CC16', hex: '#84CC16' },
];

const NATURE_THEMES: ThemeMeta[] = [
  { id: 'nature_amazon', name: 'Amazon Rainforest', category: 'nature', tagline: 'Deep lush tropical canopy emerald.', swatch: '#059669', hex: '#059669' },
  { id: 'saas_hubspot', name: 'HubSpot Warm Coral', category: 'nature', tagline: 'Inbound marketing iconic warm sunset.', swatch: '#FF7A59', hex: '#FF7A59' },
  { id: 'nature_desert', name: 'Sahara Sand Gold', category: 'nature', tagline: 'Golden windswept desert horizon.', swatch: '#D97706', hex: '#D97706' },
  { id: 'nature_glacier', name: 'Arctic Glacier', category: 'nature', tagline: 'Pure crystalline glacial meltwater.', swatch: '#0284C7', hex: '#0284C7' },
];

export const THEMES: ReadonlyArray<ThemeMeta> = [
  ...SAAS_THEMES,
  ...LUXURY_THEMES,
  ...VIBRANT_THEMES,
  ...NATURE_THEMES,
];

export const THEME_IDS = THEMES.map((t) => t.id);
export type ThemeId = string;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS.includes(value) || value.startsWith('#'));
}

/**
 * Dynamically injects CSS variables for any chosen Hex/Theme color
 * into the DOM in real-time.
 */
export function applyThemeToDom(themeIdOrHex: string) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Check if it's a known theme or a raw hex code
  let targetHex = '#10B981'; // default emerald
  if (themeIdOrHex.startsWith('#')) {
    targetHex = themeIdOrHex;
  } else {
    const matched = THEMES.find((t) => t.id === themeIdOrHex);
    if (matched) targetHex = matched.hex;
  }

  // Parse RGB components
  const r = parseInt(targetHex.slice(1, 3), 16) || 16;
  const g = parseInt(targetHex.slice(3, 5), 16) || 185;
  const b = parseInt(targetHex.slice(5, 7), 16) || 129;

  // Set the dataset attributes
  root.dataset.theme = themeIdOrHex;

  // Dynamic CSS variables override
  root.style.setProperty('--primary', targetHex);
  root.style.setProperty('--ring', `rgba(${r}, ${g}, ${b}, 0.4)`);
  root.style.setProperty('--primary-hover', `rgba(${r}, ${g}, ${b}, 0.88)`);
  root.style.setProperty('--primary-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.style.setProperty('--primary-soft-2', `rgba(${r}, ${g}, ${b}, 0.22)`);
  root.style.setProperty('--sidebar-primary', targetHex);
  root.style.setProperty('--chart-1', targetHex);
}
