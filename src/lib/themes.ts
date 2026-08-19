/**
 * Single source of truth for the color-theme catalog.
 *
 * The CSS variables themselves live in `src/app/globals.css` under
 * `html[data-theme="..."]` blocks.
 */

export const THEME_IDS = [
  "emerald",
  "cobalt",
  "cyan",
  "indigo",
  "violet",
  "amber",
  "rose",
  "crimson",
  "jade",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "emerald";

export const STORAGE_KEY = "wacrm.theme";

export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "dark";

export const MODE_STORAGE_KEY = "wacrm.mode";

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === "string" && (MODES as ReadonlyArray<string>).includes(value)
  );
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: "emerald",
    name: "Emerald Green",
    tagline: "The flagship theme — vibrant WeChat & WhatsApp messaging green.",
    swatch: "oklch(0.68 0.20 155)",
  },
  {
    id: "cobalt",
    name: "Electric Blue",
    tagline: "Clean, high-tech modern SaaS blue with cyan highlights.",
    swatch: "oklch(0.62 0.22 245)",
  },
  {
    id: "cyan",
    name: "Cyber Cyan",
    tagline: "Luminous neon turquoise with high-tech futuristic energy.",
    swatch: "oklch(0.75 0.18 200)",
  },
  {
    id: "indigo",
    name: "Midnight Indigo",
    tagline: "Deep space indigo with sleek starry electric accents.",
    swatch: "oklch(0.58 0.24 275)",
  },
  {
    id: "violet",
    name: "Royal Violet",
    tagline: "Confident, deep purple and ultraviolet aesthetic.",
    swatch: "oklch(0.55 0.23 293)",
  },
  {
    id: "amber",
    name: "Golden Amber",
    tagline: "Warm, inviting solar glow — feels friendly and approachable.",
    swatch: "oklch(0.745 0.16 65)",
  },
  {
    id: "rose",
    name: "Neon Rose",
    tagline: "Bold and expressive — D2C, creator-economy, modern lifestyle.",
    swatch: "oklch(0.645 0.22 16)",
  },
  {
    id: "crimson",
    name: "Ruby Crimson",
    tagline: "Vibrant and powerful high-contrast fiery crimson.",
    swatch: "oklch(0.58 0.23 25)",
  },
  {
    id: "jade",
    name: "Mint Jade",
    tagline: "Fresh botanical mint with clean organic green vibes.",
    swatch: "oklch(0.72 0.19 160)",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
