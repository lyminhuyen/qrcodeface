import type { ProviderReadiness } from './domain';

const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'];

export function providerReadiness(): ProviderReadiness {
  const missingEnvironment = required.filter((name) => !process.env[name]);
  return {
    provider: 'supabase',
    label: 'Supabase Auth + Postgres',
    configured: missingEnvironment.length === 0,
    missingEnvironment,
    notes: ['SSR HttpOnly cookie flow', 'Postgres RLS ownership policies', 'TOTP/AAL2 required for admin'],
  };
}
