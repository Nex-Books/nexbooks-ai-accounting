import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  redirect('/app/dashboard');
}
