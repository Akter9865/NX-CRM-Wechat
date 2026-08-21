"use client";

import { useState, useMemo } from "react";
import {
  Check,
  Moon,
  Palette,
  SunMoon,
  Sun,
  Search,
  Sparkles,
  Pipette,
  Layers,
  Wand2,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import {
  MODES,
  THEMES,
  THEME_CATEGORIES,
  type Mode,
  type ThemeCategory,
  type ThemeMeta,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { SettingsPanelHead } from "./settings-panel-head";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AppearancePanel() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const t = useTranslations("Settings.appearance");

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customHex, setCustomHex] = useState("#10B981");

  const filteredThemes = useMemo(() => {
    return THEMES.filter((tObj) => {
      const matchCategory = selectedCategory === "all" || tObj.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        tObj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tObj.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tObj.hex.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleApplyCustomHex = () => {
    if (!/^#[0-9A-F]{6}$/i.test(customHex)) {
      toast.error("Please enter a valid 6-digit hex code (e.g. #10B981)");
      return;
    }
    setTheme(customHex);
    toast.success(`Custom Brand Color ${customHex} applied!`);
  };

  return (
    <section className="max-w-6xl animate-in fade-in-50 duration-200 space-y-8">
      <SettingsPanelHead
        title={t("title")}
        description="Choose from 200+ curated color themes or enter your agency's custom brand color with real-time live preview."
      />

      {/* 1. Mode Selector (Light / Dark) */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <SunMoon className="size-4 text-primary" />
          <span>Interface Appearance Mode</span>
        </h3>

        <div
          role="radiogroup"
          aria-label="Color mode"
          className="grid max-w-md grid-cols-2 gap-3"
        >
          {MODES.map((m) => (
            <ModeCard
              key={m}
              mode={m}
              isActive={m === mode}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>

      {/* 2. Custom Brand Color Studio */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Pipette className="size-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Custom Agency Brand Color Studio</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                  Infinite Colors
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick or paste any exact hex color code for your customized white-label CRM.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Native Color Picker */}
          <div className="relative flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 p-1.5 pr-3 shadow-xs">
            <input
              type="color"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
              className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              title="Pick color"
            />
            <Input
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
              placeholder="#10B981"
              className="h-8 w-28 text-xs font-mono font-semibold uppercase bg-card"
            />
          </div>

          <Button
            size="sm"
            onClick={handleApplyCustomHex}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm"
          >
            <Wand2 className="size-3.5" />
            <span>Apply Brand Color</span>
          </Button>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            {["#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F97316", "#06B6D4"].map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  setCustomHex(hex);
                  setTheme(hex);
                }}
                className="h-6 w-6 rounded-full border border-white/20 transition-transform hover:scale-125 shadow-xs"
                style={{ backgroundColor: hex }}
                title={`Apply ${hex}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. 200+ Curated Color Themes Gallery */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Palette className="size-4 text-primary" />
              <span>Curated Theme Palette Collection</span>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                230+ Themes
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant one-click theme presets crafted for modern dark and light interfaces.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, vibe, or hex..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-card"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {THEME_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 max-h-[600px] overflow-y-auto p-1 pr-2 rounded-2xl border border-border/40 bg-muted/10">
          {filteredThemes.map((tObj) => (
            <ThemeCard
              key={tObj.id}
              theme={tObj}
              isActive={tObj.id === theme || tObj.hex.toUpperCase() === theme.toUpperCase()}
              onPick={() => setTheme(tObj.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  mode,
  isActive,
  onPick,
}: {
  mode: Mode;
  isActive: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("Settings.appearance");
  const isLight = mode === "light";
  const Icon = isLight ? Sun : Moon;
  return (
    <button
      type="button"
      role="radio"
      onClick={onPick}
      aria-checked={isActive}
      aria-label={t("useMode", { mode })}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
        isActive
          ? "border-primary ring-2 ring-primary/30 shadow-sm"
          : "border-border hover:border-border hover:bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="flex-1 text-sm font-bold capitalize text-foreground">
        {mode}
      </span>
      {isActive && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          <Check className="h-3 w-3" />
          {t("active")}
        </span>
      )}
    </button>
  );
}

function ThemeCard({
  theme,
  isActive,
  onPick,
}: {
  theme: ThemeMeta;
  isActive: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("Settings.appearance");
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={t("useTheme", { name: theme.name })}
      className={cn(
        "group relative flex flex-col justify-between gap-2.5 rounded-xl border bg-card p-3.5 text-left transition-all duration-200",
        isActive
          ? "border-primary ring-2 ring-primary/40 shadow-sm bg-primary/5"
          : "border-border/80 hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-6 w-6 shrink-0 rounded-full border border-white/20 shadow-xs transition-transform group-hover:scale-110"
            style={{ backgroundColor: theme.swatch }}
          />
          <div className="text-xs font-bold text-foreground line-clamp-1">
            {theme.name}
          </div>
        </div>

        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Check className="h-3 w-3" />
            {t("active")}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            {theme.hex}
          </span>
        )}
      </div>

      <div className="text-[11px] leading-relaxed text-muted-foreground line-clamp-1">
        {theme.tagline}
      </div>

      {/* Mini Color Bar */}
      <div className="flex h-1.5 overflow-hidden rounded-full mt-1 bg-muted/60" aria-hidden>
        <span className="flex-1" style={{ backgroundColor: theme.swatch }} />
        <span className="w-4 bg-muted-foreground/30" />
      </div>
    </button>
  );
}
