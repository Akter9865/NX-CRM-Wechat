'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const { score, label, colorClass, requirements } = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: '',
        colorClass: 'bg-muted-foreground/20',
        requirements: {
          minLen: false,
          hasNumber: false,
          hasLetter: false,
        },
      };
    }

    const minLen = password.length >= 6;
    const goodLen = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    let calculatedScore = 0;
    if (minLen) calculatedScore += 1;
    if (goodLen) calculatedScore += 1;
    if (hasLetter && hasNumber) calculatedScore += 1;
    if (hasSpecial || password.length >= 12) calculatedScore += 1;

    let scoreLabel = 'Weak';
    let barColor = 'bg-red-500';

    if (calculatedScore === 2) {
      scoreLabel = 'Fair';
      barColor = 'bg-amber-500';
    } else if (calculatedScore === 3) {
      scoreLabel = 'Good';
      barColor = 'bg-blue-500';
    } else if (calculatedScore >= 4) {
      scoreLabel = 'Strong';
      barColor = 'bg-emerald-500';
    }

    return {
      score: calculatedScore,
      label: scoreLabel,
      colorClass: barColor,
      requirements: {
        minLen,
        hasNumber,
        hasLetter,
      },
    };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
      {/* 4-bar strength meter */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={cn(
              'font-medium transition-colors',
              score <= 1 && 'text-red-400',
              score === 2 && 'text-amber-400',
              score === 3 && 'text-blue-400',
              score >= 4 && 'text-emerald-400'
            )}
          >
            {label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                'h-full rounded-full transition-all duration-300',
                score >= step ? colorClass : 'bg-muted/80'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          <div
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              requirements.minLen ? 'text-emerald-400' : 'text-muted-foreground'
            )}
          >
            {requirements.minLen ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <X className="size-3 shrink-0 opacity-40" />
            )}
            <span>6+ characters</span>
          </div>

          <div
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              requirements.hasLetter && requirements.hasNumber
                ? 'text-emerald-400'
                : 'text-muted-foreground'
            )}
          >
            {requirements.hasLetter && requirements.hasNumber ? (
              <Check className="size-3 shrink-0" />
            ) : (
              <X className="size-3 shrink-0 opacity-40" />
            )}
            <span>Letters & numbers</span>
          </div>
        </div>
      )}
    </div>
  );
}
