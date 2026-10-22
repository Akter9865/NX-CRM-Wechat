"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";

/**
 * Light/dark mode toggle — a single icon button that flips the app
 * between the two modes. Sun shows in light mode (click → go dark),
 * moon shows in dark mode (click → go light); the label always names
 * the destination so screen-reader users hear what the click does.
 *
 * 40×40 hit target to match the header's other touch controls.
 */
export function ModeToggle({ className }: { className?: string }) {
  const t = useTranslations("ModeToggle");
  const { mode, toggleMode } = useTheme();
  const goingTo = mode === "dark" ? "light" : "dark";
  const switchLabel = t("switchMode", { mode: goingTo });
  
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={switchLabel}
      title={switchLabel}
      className={cn(
        "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-primary/40 shrink-0",
        className,
      )}
    >
      {mode === "dark" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
