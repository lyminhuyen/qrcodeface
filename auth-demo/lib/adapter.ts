import type { AuthEvaluationAdapter } from './domain';
import { createSupabaseAdapter } from './providers/supabase';

export async function getAdapter(): Promise<AuthEvaluationAdapter> {
  return createSupabaseAdapter();
}
