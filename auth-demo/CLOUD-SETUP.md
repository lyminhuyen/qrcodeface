# Supabase auth demo deployment

This app is an isolated deployment demo. It does not change the QRCodeFace
gallery or its production deployment.

## Local run

1. Copy `.env.example` to `.env.local` and fill in the three Supabase values.
2. Run `npm install`, then `npm run dev`.
3. Open `http://localhost:3000`.

Development uses Cloudflare's official test keys when Turnstile keys are not
configured. Never use the test secret in a deployed environment.

## Vercel project

Create a separate Vercel project from this repository and set its **Root
Directory** to `auth-demo`. Add these environment variables to Preview and
Production:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `APP_URL` — the deployed origin, for example `https://example.vercel.app`

Existing demo accounts can log in with only those four values. Registration and
password reset fail closed until these are also set:

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_ALLOWED_HOSTNAMES` — comma-separated hostnames, without scheme or path

Add the deployed hostname to the Turnstile widget's allowed hostnames. Add the
same deployed origin to Supabase Auth redirect URLs before testing email flows.

For an isolated Vercel Preview only, `TURNSTILE_TEST_MODE=true` enables
Cloudflare's official always-pass test keys. The code requires
`VERCEL_ENV=preview`, so this flag cannot activate test mode on Production.

## Security boundary

- The publishable key may be used by the auth client.
- `SUPABASE_SECRET_KEY` and `TURNSTILE_SECRET_KEY` are server-only values.
- Do not prefix either secret with `NEXT_PUBLIC_` and never commit `.env.local`.
- Admin data and mutations require an active `admin` profile plus a TOTP-verified
  AAL2 session.
- Favorites are protected by ownership and active-account RLS policies.

For a new Supabase project, apply `schema/supabase.sql` in the SQL editor before
testing. The current sandbox already has the schema and hardening applied.
