import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { providerReadiness } from '@/lib/provider-config';

export const metadata: Metadata = {
  title: 'QRCodeFace Auth Demo',
  description: 'Isolated Supabase user and admin authentication demo',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const readiness = providerReadiness();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="shell topbar-inner">
            <Link className="brand" href="/">QRCodeFace · {readiness.provider}</Link>
            <nav className="nav" aria-label="Authentication demo navigation">
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
              <Link href="/account">Account</Link>
              <Link href="/account/favorites">Favorites</Link>
              <Link href="/account/security">Security</Link>
              <Link href="/account/admin/users">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
