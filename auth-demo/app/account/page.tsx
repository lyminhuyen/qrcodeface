import Link from 'next/link';
import { signOutAction } from '@/app/actions';
import { getAdapter } from '@/lib/adapter';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const adapter = await getAdapter();
  const session = await adapter.getSession();
  if (!session) return <section className="card"><h1>No active session</h1><p>Sign in after the sandbox environment is configured.</p><Link className="button" href="/login">Open login</Link></section>;
  return <><section className="hero"><div className="eyebrow">Protected server render</div><h1>{session.email}</h1></section><div className="grid"><section className="card"><h2>Authorization</h2><p>Role: <code>{session.role}</code></p><p>State: <code>{session.state}</code></p><p>MFA: <code>{session.mfaVerified ? 'verified' : 'not verified'}</code></p></section><section className="card"><h2>Session</h2><form action={signOutAction}><button type="submit">Sign out</button></form></section></div></>;
}
