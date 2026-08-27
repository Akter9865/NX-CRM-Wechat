'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  href?: string;
}

export function BrandLogo({
  className,
  size = 'md',
  showBadge = true,
  href = '/',
}: BrandLogoProps) {
  // Sizing configurations
  const heightMap = {
    sm: 'h-6 sm:h-7',
    md: 'h-7 sm:h-8',
    lg: 'h-9 sm:h-11',
  };

  const imageWidthMap = {
    sm: 130,
    md: 160,
    lg: 210,
  };

  const imageHeightMap = {
    sm: 30,
    md: 38,
    lg: 48,
  };

  const content = (
    <div className={cn('flex items-center gap-2 group transition-transform duration-200 hover:opacity-95', className)}>
      <div className="relative flex items-center shrink-0">
        <Image
          src="/images/marketing/nxcrm-logo-tight.png"
          alt="NX CRM - Powered by Nexora Spark Agency"
          width={imageWidthMap[size]}
          height={imageHeightMap[size]}
          priority
          className={cn(
            heightMap[size],
            'w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]'
          )}
        />
      </div>

      {showBadge && (
        <span className="hidden md:inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
          WhatsApp
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
