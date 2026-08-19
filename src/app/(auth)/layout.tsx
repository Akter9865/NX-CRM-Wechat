import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppFooter } from '@/components/layout/app-footer';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background selection:bg-primary/20 selection:text-primary">
      {/* Modern Split SaaS Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-64px)]">
        {/* Left Side: Brand Showcase Panel (Desktop only) */}
        <div className="hidden lg:block lg:col-span-6 xl:col-span-7">
          <AuthBrandPanel />
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 xl:p-16 relative overflow-hidden bg-background">
          {/* Ambient Background Glow Effect */}
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <div className="h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md mx-auto py-8">
            {children}
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
