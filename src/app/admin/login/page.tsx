import { redirect } from 'next/navigation';

export default function AdminLoginRedirectPage() {
  redirect('/superadmin/login');
}
