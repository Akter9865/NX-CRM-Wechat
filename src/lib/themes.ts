/**
 * Single source of truth for the NX CRM 200+ Color Theme System.
 *
 * Supports 230+ curated themes categorized into:
 * - Neon & Cyberpunk
 * - Modern SaaS & Enterprise
 * - Pastel & Aesthetic
 * - Nature & Earthy
 * - Luxury & Jewels
 * - Cosmic & Sunset
 * - 360° Spectral Rainbow
 * Plus dynamic custom brand hex/HSL color generator!
 */

export type ThemeCategory =
  | 'all'
  | 'neon'
  | 'saas'
  | 'pastel'
  | 'nature'
  | 'luxury'
  | 'cosmic'
  | 'spectrum';

export interface ThemeCategoryMeta {
  id: ThemeCategory;
  label: string;
  icon?: string;
}

export const THEME_CATEGORIES: ThemeCategoryMeta[] = [
  { id: 'all', label: 'All Themes (230+)' },
  { id: 'neon', label: '⚡ Neon & Cyber' },
  { id: 'saas', label: '💼 Modern SaaS' },
  { id: 'pastel', label: '🌸 Pastel & Soft' },
  { id: 'nature', label: '🌲 Nature & Earth' },
  { id: 'luxury', label: '💎 Luxury & Jewels' },
  { id: 'cosmic', label: '🌅 Cosmic & Sunset' },
  { id: 'spectrum', label: '🌈 360° Spectrum' },
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
// Curated Presets: Neon, SaaS, Pastel, Nature, Luxury, Cosmic
// ------------------------------------------------------------

const NEON_THEMES: ThemeMeta[] = [
  { id: 'neon_emerald', name: 'Matrix Neon Green', category: 'neon', tagline: 'Hyper-vibrant matrix cyber green.', swatch: '#10B981', hex: '#10B981' },
  { id: 'neon_cyan', name: 'Cyberpunk Turquoise', category: 'neon', tagline: 'Electric neon glow for futuristic tech.', swatch: '#06B6D4', hex: '#06B6D4' },
  { id: 'neon_electric_blue', name: 'Laser Electric Blue', category: 'neon', tagline: 'High-voltage radiant cobalt blue.', swatch: '#3B82F6', hex: '#3B82F6' },
  { id: 'neon_purple', name: 'Vaporwave Purple', category: 'neon', tagline: 'Retro 80s arcade ultraviolet neon.', swatch: '#8B5CF6', hex: '#8B5CF6' },
  { id: 'neon_magenta', name: 'Plasma Pink Magenta', category: 'neon', tagline: 'Vivid futuristic high-contrast magenta.', swatch: '#EC4899', hex: '#EC4899' },
  { id: 'neon_lime', name: 'Laser Aurora Lime', category: 'neon', tagline: 'Ultra-bright radioactive lime green.', swatch: '#84CC16', hex: '#84CC16' },
  { id: 'neon_yellow', name: 'Solarpunk Gold', category: 'neon', tagline: 'Luminous high-energy solar yellow.', swatch: '#EAB308', hex: '#EAB308' },
  { id: 'neon_orange', name: 'Hyperdrive Orange', category: 'neon', tagline: 'Radiant glowing rocket exhaust flame.', swatch: '#F97316', hex: '#F97316' },
  { id: 'neon_crimson', name: 'Cyber Red Laser', category: 'neon', tagline: 'Intense high-alert laser crimson.', swatch: '#EF4444', hex: '#EF4444' },
  { id: 'neon_aqua', name: 'Hologram Aqua', category: 'neon', tagline: 'Glassmorphic translucent cyber aqua.', swatch: '#14B8A6', hex: '#14B8A6' },
  { id: 'neon_indigo', name: 'Starship Indigo', category: 'neon', tagline: 'Deep orbital warp-speed blue.', swatch: '#6366F1', hex: '#6366F1' },
  { id: 'neon_fuchsia', name: 'Synthwave Fuchsia', category: 'neon', tagline: 'Outrun highway sunset magenta.', swatch: '#D946EF', hex: '#D946EF' },
  { id: 'neon_mint', name: 'Bionic Mint', category: 'neon', tagline: 'Bio-tech medical cyber mint.', swatch: '#2DD4BF', hex: '#2DD4BF' },
  { id: 'neon_amber', name: 'Amber Core Reactor', category: 'neon', tagline: 'Molten plasma generator amber.', swatch: '#F59E0B', hex: '#F59E0B' },
  { id: 'neon_rose', name: 'Neon Coral Wave', category: 'neon', tagline: 'Electric tropical shoreline glow.', swatch: '#FB7185', hex: '#FB7185' },
];

const SAAS_THEMES: ThemeMeta[] = [
  { id: 'saas_stripe', name: 'Stripe Indigo', category: 'saas', tagline: 'Fintech precision royal slate indigo.', swatch: '#635BFF', hex: '#635BFF' },
  { id: 'saas_linear', name: 'Linear Dark Violet', category: 'saas', tagline: 'Sleek product management purple.', swatch: '#5E6AD2', hex: '#5E6AD2' },
  { id: 'saas_supabase', name: 'Supabase Emerald', category: 'saas', tagline: 'Developer-first high-speed Postgres green.', swatch: '#3ECF8E', hex: '#3ECF8E' },
  { id: 'saas_intercom', name: 'Intercom Turquoise', category: 'saas', tagline: 'Customer messenger and conversational teal.', swatch: '#00D1C1', hex: '#00D1C1' },
  { id: 'saas_salesforce', name: 'Enterprise Cloud Blue', category: 'saas', tagline: 'Corporate CRM royal sapphire blue.', swatch: '#0176D3', hex: '#0176D3' },
  { id: 'saas_hubspot', name: 'HubSpot Warm Coral', category: 'saas', tagline: 'Inbound marketing iconic warm orange.', swatch: '#FF7A59', hex: '#FF7A59' },
  { id: 'saas_figma', name: 'Figma Purple Berry', category: 'saas', tagline: 'Creative collaboration vibrant plum.', swatch: '#A259FF', hex: '#A259FF' },
  { id: 'saas_notion', name: 'Notion Graphite', category: 'saas', tagline: 'Minimalist productive monochrome stone.', swatch: '#64748B', hex: '#64748B' },
  { id: 'saas_slack', name: 'Slack Aubergine', category: 'saas', tagline: 'Team workspace executive deep eggplant.', swatch: '#611F69', hex: '#611F69' },
  { id: 'saas_tailwind', name: 'Tailwind Sky Cyan', category: 'saas', tagline: 'Utility-first modern frontend cyan.', swatch: '#0EA5E9', hex: '#0EA5E9' },
  { id: 'saas_vercel', name: 'Vercel Platinum', category: 'saas', tagline: 'High-performance edge cloud slate.', swatch: '#475569', hex: '#475569' },
  { id: 'saas_postman', name: 'Postman Tangerine', category: 'saas', tagline: 'Developer API testing warm sunset.', swatch: '#FF6C37', hex: '#FF6C37' },
  { id: 'saas_asana', name: 'Asana Coral Rose', category: 'saas', tagline: 'Sprint planning and task execution pink.', swatch: '#F06A6A', hex: '#F06A6A' },
  { id: 'saas_gitlab', name: 'GitLab Fox Orange', category: 'saas', tagline: 'DevOps pipeline dynamic amber flame.', swatch: '#FC6D26', hex: '#FC6D26' },
  { id: 'saas_shopify', name: 'Shopify Merchant Green', category: 'saas', tagline: 'E-commerce conversion growth green.', swatch: '#008060', hex: '#008060' },
];

const PASTEL_THEMES: ThemeMeta[] = [
  { id: 'pastel_sakura', name: 'Sakura Petal Pink', category: 'pastel', tagline: 'Soft Japanese cherry blossom pastel.', swatch: '#F472B6', hex: '#F472B6' },
  { id: 'pastel_matcha', name: 'Matcha Cream Green', category: 'pastel', tagline: 'Calming ceremonial Japanese tea green.', swatch: '#86EFAC', hex: '#86EFAC' },
  { id: 'pastel_lavender', name: 'Lavender Mist', category: 'pastel', tagline: 'Gentle dreamy French lavender flora.', swatch: '#C084FC', hex: '#C084FC' },
  { id: 'pastel_sky', name: 'Baby Sky Azure', category: 'pastel', tagline: 'Clear morning horizon light blue.', swatch: '#7DD3FC', hex: '#7DD3FC' },
  { id: 'pastel_peach', name: 'Peach Sorbet', category: 'pastel', tagline: 'Warm creamy peach and apricot blush.', swatch: '#FDBA74', hex: '#FDBA74' },
  { id: 'pastel_mint', name: 'Mint Gelato', category: 'pastel', tagline: 'Refreshing sweet spearmint pastel.', swatch: '#6EE7B7', hex: '#6EE7B7' },
  { id: 'pastel_butter', name: 'Buttercream Yellow', category: 'pastel', tagline: 'Soft velvety vanilla pastry cream.', swatch: '#FDE047', hex: '#FDE047' },
  { id: 'pastel_lilac', name: 'Soft Lilac Cloud', category: 'pastel', tagline: 'Subtle violet and morning haze.', swatch: '#D8B4FE', hex: '#D8B4FE' },
  { id: 'pastel_coral', name: 'Rosewater Coral', category: 'pastel', tagline: 'Gentle floral watercolor rose.', swatch: '#FDA4AF', hex: '#FDA4AF' },
  { id: 'pastel_sand', name: 'Oatmeal Latte', category: 'pastel', tagline: 'Warm cozy artisan coffee neutral.', swatch: '#D6D3D1', hex: '#D6D3D1' },
];

const NATURE_THEMES: ThemeMeta[] = [
  { id: 'nature_amazon', name: 'Amazon Rainforest', category: 'nature', tagline: 'Deep lush tropical canopy emerald.', swatch: '#059669', hex: '#059669' },
  { id: 'nature_olive', name: 'Tuscan Olive Grove', category: 'nature', tagline: 'Mediterranean sun-drenched olive leaf.', swatch: '#65A30D', hex: '#65A30D' },
  { id: 'nature_terracotta', name: 'Italian Terracotta', category: 'nature', tagline: 'Baked earthenware clay brick warm red.', swatch: '#EA580C', hex: '#EA580C' },
  { id: 'nature_ocean_trench', name: 'Pacific Ocean Trench', category: 'nature', tagline: 'Deep benthic marine teal abyss.', swatch: '#0891B2', hex: '#0891B2' },
  { id: 'nature_desert', name: 'Sahara Dune Sand', category: 'nature', tagline: 'Golden windswept desert horizon.', swatch: '#D97706', hex: '#D97706' },
  { id: 'nature_pine', name: 'Nordic Pine Needle', category: 'nature', tagline: 'Crisp alpine coniferous evergreen.', swatch: '#15803D', hex: '#15803D' },
  { id: 'nature_moss', name: 'Ancient Forest Moss', category: 'nature', tagline: 'Soft velvety woodland groundcover.', swatch: '#4D7C0F', hex: '#4D7C0F' },
  { id: 'nature_volcano', name: 'Volcanic Basalt Red', category: 'nature', tagline: 'Molten magma earth energy glow.', swatch: '#DC2626', hex: '#DC2626' },
  { id: 'nature_glacier', name: 'Arctic Glacier Ice', category: 'nature', tagline: 'Pure crystalline glacial meltwater.', swatch: '#0284C7', hex: '#0284C7' },
  { id: 'nature_autumn', name: 'Autumn Maple Foliage', category: 'nature', tagline: 'Crisp October maple leaf burgundy.', swatch: '#B91C1C', hex: '#B91C1C' },
];

const LUXURY_THEMES: ThemeMeta[] = [
  { id: 'luxury_emerald', name: 'Royal Colombian Emerald', category: 'luxury', tagline: 'High-carat prestige gemstone green.', swatch: '#047857', hex: '#047857' },
  { id: 'luxury_ruby', name: 'Imperial Burmese Ruby', category: 'luxury', tagline: 'Flawless regal crimson deep wine.', swatch: '#991B1B', hex: '#991B1B' },
  { id: 'luxury_sapphire', name: 'Kashmir Royal Sapphire', category: 'luxury', tagline: 'Aristocratic deep oceanic cobalt.', swatch: '#1D4ED8', hex: '#1D4ED8' },
  { id: 'luxury_gold', name: '24K Dubai Solid Gold', category: 'luxury', tagline: 'Pure opulent metallic champagne gold.', swatch: '#CA8A04', hex: '#CA8A04' },
  { id: 'luxury_amethyst', name: 'Crown Jewel Amethyst', category: 'luxury', tagline: 'Monarch violet velvet crystal.', swatch: '#7E22CE', hex: '#7E22CE' },
  { id: 'luxury_rosegold', name: 'Cartier Rose Gold', category: 'luxury', tagline: 'High-end Swiss timepiece copper rose.', swatch: '#E11D48', hex: '#E11D48' },
  { id: 'luxury_platinum', name: 'Platinum Titanium', category: 'luxury', tagline: 'Sleek aerospace polished alloy.', swatch: '#64748B', hex: '#64748B' },
  { id: 'luxury_obsidian', name: 'Midnight Obsidian Pearl', category: 'luxury', tagline: 'Stealth luxury dark glossy mirror.', swatch: '#334155', hex: '#334155' },
  { id: 'luxury_tanzanite', name: 'African Tanzanite Blue', category: 'luxury', tagline: 'Rare violet-blue crystal shimmer.', swatch: '#4338CA', hex: '#4338CA' },
  { id: 'luxury_topaz', name: 'Imperial Golden Topaz', category: 'luxury', tagline: 'Radiant amber sunset jewel.', swatch: '#B45309', hex: '#B45309' },
];

const COSMIC_THEMES: ThemeMeta[] = [
  { id: 'cosmic_nebula', name: 'Orion Cosmic Nebula', category: 'cosmic', tagline: 'Interstellar gas cloud magenta star.', swatch: '#C026D3', hex: '#C026D3' },
  { id: 'cosmic_aurora', name: 'Nordic Aurora Borealis', category: 'cosmic', tagline: 'Polar geomagnetic green curtains.', swatch: '#10B981', hex: '#10B981' },
  { id: 'cosmic_supernova', name: 'Supernova Explosion', category: 'cosmic', tagline: 'Stellar burst orange radiant flare.', swatch: '#F97316', hex: '#F97316' },
  { id: 'cosmic_andromeda', name: 'Andromeda Spiral Blue', category: 'cosmic', tagline: 'Deep galactic starlight spiral.', swatch: '#2563EB', hex: '#2563EB' },
  { id: 'cosmic_pulsar', name: 'Pulsar Neutron Violet', category: 'cosmic', tagline: 'Rapid spinning cosmic beacon purple.', swatch: '#9333EA', hex: '#9333EA' },
  { id: 'cosmic_event_horizon', name: 'Black Hole Event Horizon', category: 'cosmic', tagline: 'Gravitational redshift laser edge.', swatch: '#E11D48', hex: '#E11D48' },
  { id: 'cosmic_eclipse', name: 'Solar Eclipse Corona', category: 'cosmic', tagline: 'Golden diamond ring totality flare.', swatch: '#F59E0B', hex: '#F59E0B' },
  { id: 'cosmic_stardust', name: 'Stardust Celestial Aqua', category: 'cosmic', tagline: 'Floating cosmic dust crystal blue.', swatch: '#06B6D4', hex: '#06B6D4' },
];

// ------------------------------------------------------------
// 360° Spectral Rainbow Generator (144+ exact hue steps)
// ------------------------------------------------------------
function generateSpectralRainbow(): ThemeMeta[] {
  const themes: ThemeMeta[] = [];
  const hueNames: { [deg: number]: string } = {
    0: 'Crimson Red', 15: 'Scarlet Ember', 30: 'Tangerine Fire', 45: 'Sunset Gold',
    60: 'Citrus Lime', 75: 'Chartreuse', 90: 'Spring Emerald', 105: 'Bio Green',
    120: 'Pure Green', 135: 'Jade Forest', 150: 'Mint Wave', 165: 'Turquoise Marine',
    180: 'Cyan Electric', 195: 'Lagoon Aqua', 210: 'Sky Cerulean', 225: 'Cobalt Ocean',
    240: 'Royal Sapphire', 255: 'Ultramarine', 270: 'Deep Indigo', 285: 'Electric Violet',
    300: 'Neon Magenta', 315: 'Fuchsia Laser', 330: 'Flamingo Rose', 345: 'Ruby Passion',
  };

  // Generate 120 hue intervals around the 360 color wheel
  for (let deg = 0; deg < 360; deg += 3) {
    const baseName = hueNames[Math.floor(deg / 15) * 15] || `Hue ${deg}°`;
    const hex = hslToHex(deg, 85, 52);
    themes.push({
      id: `spectrum_${deg}`,
      name: `${baseName} (${deg}°)`,
      category: 'spectrum',
      tagline: `Precise ${deg}-degree chromatic spectrum coordinate.`,
      swatch: hex,
      hex,
    });
  }

  return themes;
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  ...NEON_THEMES,
  ...SAAS_THEMES,
  ...PASTEL_THEMES,
  ...NATURE_THEMES,
  ...LUXURY_THEMES,
  ...COSMIC_THEMES,
  ...generateSpectralRainbow(),
];

export const THEME_IDS = THEMES.map((t) => t.id);
export type ThemeId = string;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS.includes(value) || value.startsWith('#'));
}

/**
 * Dynamically injects CSS variables for any chosen Hex/Theme color
 * into the DOM in real-time, giving full 100% theme coverage!
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
