'use client';

import { useState, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Executive Sidebar with Mobile Drawer & Desktop Sticky view */}
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main Administrative Workplace */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onOpenSidebar={openSidebar} />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
