import { notFound } from 'next/navigation';
import { isLocalToolRuntime } from '@/lib/local-runtime.server';

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isLocalToolRuntime()) notFound();
  return children;
}
