import { getAdapter } from '@/lib/adapter';
import { mutateUserAction } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const adapter = await getAdapter();
  const result = await adapter.listUsers(q);
  return <><section className="hero"><div className="eyebrow">Admin + MFA boundary</div><h1>User management</h1><p>Provider admin credentials stay server-only; the current session must be admin with MFA.</p></section><section className="card"><form className="form" method="get"><label>Search<input name="q" defaultValue={q} /></label><button type="submit">Search</button></form>{!result.ok ? <div className="message danger">{result.message}</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Email</th><th>Role</th><th>State</th><th>Last sign in</th><th>Actions</th></tr></thead><tbody>{result.data?.map((user) => <tr key={user.userId}><td>{user.email}</td><td>{user.role}</td><td>{user.state}</td><td>{user.lastSignInAt ?? '—'}</td><td><form className="actions" action={mutateUserAction}><input type="hidden" name="userId" value={user.userId} /><button name="action" value={user.role === 'admin' ? 'demote' : 'promote'}>{user.role === 'admin' ? 'Demote' : 'Promote'}</button><button name="action" value={user.state === 'active' ? 'suspend' : 'restore'}>{user.state === 'active' ? 'Suspend' : 'Restore'}</button><button name="action" value={user.state === 'pending_deletion' ? 'cancel_deletion' : 'request_deletion'}>{user.state === 'pending_deletion' ? 'Cancel deletion' : 'Delete in 30d'}</button></form></td></tr>)}</tbody></table></div>}</section></>;
}
