'use client';

import { useState, forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  showCapsWarning?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showCapsWarning = true, onKeyDown, onKeyUp, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);

    const handleKeyChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (typeof e.getModifierState === 'function') {
        setCapsLockActive(e.getModifierState('CapsLock'));
      }
    };

    return (
      <div className="relative w-full">
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'flex h-11 w-full rounded-xl border border-border/80 bg-muted/40 px-3.5 pr-11 py-2 text-sm text-foreground shadow-xs transition-all duration-200',
            'placeholder:text-muted-foreground/60',
            'hover:border-border hover:bg-muted/60',
            'focus-visible:border-primary focus-visible:bg-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          onKeyDown={(e) => {
            handleKeyChange(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            handleKeyChange(e);
            onKeyUp?.(e);
          }}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={0}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {showPassword ? (
            <EyeOff className="size-4.5" aria-hidden="true" />
          ) : (
            <Eye className="size-4.5" aria-hidden="true" />
          )}
        </button>

        {showCapsWarning && capsLockActive && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20 animate-in fade-in-50 duration-200">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>Caps Lock is ON</span>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
