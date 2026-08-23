import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Super Admin Control Center — NX CRM',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login');

  // If on login page, render clean container without admin sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Server-side authentication guard
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Executive Sidebar */}
      <AdminSidebar />

      {/* Main Administrative Workplace */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
