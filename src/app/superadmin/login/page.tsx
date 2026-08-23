import { redirect } from 'next/navigation';

export default function SuperadminLoginRedirectPage() {
  redirect('/admin/login');
}
