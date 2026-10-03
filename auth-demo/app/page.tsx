import { providerReadiness } from '@/lib/provider-config';

export const dynamic = 'force-dynamic';

export default function AuthDemoHome() {
  const readiness = providerReadiness();
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Isolated deployment demo</div>
        <h1>{readiness.label}</h1>
        <p>Test user login, Favorites ownership, TOTP enrollment and MFA-protected admin actions without changing the main gallery.</p>
        <span className={`status ${readiness.configured ? 'ready' : 'blocked'}`}>
          {readiness.configured ? 'Environment configured' : 'Cloud setup required'}
        </span>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Configuration gate</h2>
          {readiness.missingEnvironment.length === 0 ? (
              <p>Supabase environment is connected. The auth flows are ready for browser testing.</p>
          ) : (
            <ul className="list">
              {readiness.missingEnvironment.map((name) => <li key={name}><code>{name}</code></li>)}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>Architecture notes</h2>
          <ul className="list">{readiness.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
        <section className="card">
          <h2>User test</h2>
          <ol className="list"><li>Sign in with the demo user.</li><li>Add and remove a Favorite.</li><li>Sign out globally.</li></ol>
        </section>
        <section className="card">
          <h2>Admin test</h2>
          <ol className="list"><li>Sign in with the demo admin.</li><li>Enroll and verify TOTP under Security.</li><li>Open Admin and test account state actions.</li></ol>
        </section>
      </div>
    </>
  );
}
