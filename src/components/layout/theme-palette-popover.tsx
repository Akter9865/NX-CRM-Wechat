'use client';

import { useTheme } from '@/hooks/use-theme';
import { THEMES, type ThemeId } from '@/lib/themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemePalettePopover() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground border border-border/60 hover:border-primary/40 focus:outline-none"
        title="Theme Palette Colors"
        aria-label="Change Color Theme"
      >
        <Palette className="size-4 text-primary animate-pulse" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 sm:w-80 p-3 rounded-2xl border-border bg-card/98 backdrop-blur-xl shadow-2xl space-y-2 z-50"
      >
        <div className="flex items-center justify-between px-1">
          <div className="p-0 text-xs font-bold flex items-center gap-1.5 text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <span>Color Themes</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {THEMES.length} Themes
          </span>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/60" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
          {THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                className={cn(
                  'flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150',
                  isSelected
                    ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="size-3.5 rounded-full shadow-xs ring-1 ring-border/80 shrink-0"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className="truncate text-[11px]">{t.name}</span>
                </div>
                {isSelected && <Check className="size-3 text-primary shrink-0 ml-1" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
