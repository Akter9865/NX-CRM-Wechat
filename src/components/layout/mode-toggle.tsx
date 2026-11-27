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
  const { toggleMode } = useTheme();
  // Icon is chosen by CSS from <html data-mode>, so the server HTML and
  // the first client render are identical (no hydration mismatch).
  const switchLabel = t("switchMode", { mode: "light / dark" });

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={switchLabel}
      title={switchLabel}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0",
        className,
      )}
    >
      <Moon className="hidden size-[18px] dark:block" />
      <Sun className="size-[18px] dark:hidden" />
    </button>
  );
}
