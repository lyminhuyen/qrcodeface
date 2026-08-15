import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error('Supabase environment is incomplete.');

const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function cleanup() {
  const response = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (response.error) throw response.error;
  const users = response.data.users.filter((user) => user.email?.startsWith('qrf-eval-'));
  const ids = users.map((user) => user.id);
  if (ids.length) {
    await admin.from('audit_log').delete().in('actor_user_id', ids);
    await admin.from('audit_log').delete().in('target_user_id', ids);
  }
  let removed = 0;
  for (const user of users) {
    const deletion = await admin.auth.admin.deleteUser(user.id);
    if (!deletion.error) removed += 1;
  }
  process.stdout.write(`Synthetic users found: ${users.length}; removed: ${removed}.\n`);
  if (removed !== users.length) process.exitCode = 1;
}

void cleanup().catch((error: unknown) => {
  process.stderr.write(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  process.exitCode = 1;
});
