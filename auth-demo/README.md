# QRCodeFace Supabase auth demo

An isolated Next.js app for testing user and admin authentication before any
integration into the main QRCodeFace gallery.

## Included flows

- Email/password sign-in with Supabase SSR cookies
- User-owned Favorites protected by Postgres RLS
- TOTP enrollment and AAL2 verification
- Admin user listing and lifecycle actions guarded by role, active state and AAL2
- Cloudflare Turnstile protection for registration and password-reset requests
- Generic password-reset responses to reduce email enumeration

See `CLOUD-SETUP.md` for local and Vercel configuration. The database contract
for a new sandbox is in `schema/supabase.sql`.

## Commands

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
```

This demo is intentionally a separate deployment boundary. Passing its tests is
evidence for a later integration decision, not an automatic production rollout.
