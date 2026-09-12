import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment: ${name}`);
  return value;
}

const admin = createClient(
  requiredEnvironment('SUPABASE_URL'),
  requiredEnvironment('SUPABASE_SECRET_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const accounts = {
  user: { email: 'qrf-demo-user@example.com', password: `Qrf!${randomBytes(18).toString('base64url')}` },
  admin: { email: 'qrf-demo-admin@example.com', password: `Qrf!${randomBytes(18).toString('base64url')}` },
};

async function removeExistingDemoUsers() {
  const response = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (response.error) throw response.error;
  for (const user of response.data.users) {
    if (user.email === accounts.user.email || user.email === accounts.admin.email) {
      await admin.from('audit_log').delete().or(`actor_user_id.eq.${user.id},target_user_id.eq.${user.id}`);
      const deletion = await admin.auth.admin.deleteUser(user.id);
      if (deletion.error) throw deletion.error;
    }
  }
}

async function createDemoUser(email: string, password: string) {
  const response = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (response.error || !response.data.user) throw response.error ?? new Error(`Could not create ${email}.`);
  return response.data.user;
}

async function main() {
  await removeExistingDemoUsers();
  const user = await createDemoUser(accounts.user.email, accounts.user.password);
  const adminUser = await createDemoUser(accounts.admin.email, accounts.admin.password);
  const roleUpdate = await admin.from('profiles').update({ role: 'admin' }).eq('user_id', adminUser.id);
  if (roleUpdate.error) throw roleUpdate.error;

  await writeFile(
    '.demo-credentials.local.json',
    `${JSON.stringify({ localUrl: 'http://localhost:3000/login', accounts }, null, 2)}\n`,
    { mode: 0o600 },
  );
  process.stdout.write(`Created demo user and admin. Credentials saved locally; user IDs: ${user.id.slice(0, 8)}…, ${adminUser.id.slice(0, 8)}…\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`Provision failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  process.exitCode = 1;
});
