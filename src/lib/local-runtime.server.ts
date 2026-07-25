/**
 * Local tools must never become writable production endpoints.
 *
 * `next dev` is the supported runtime for the local admin panel. Setting
 * ALLOW_LOCAL_TOOLS=true keeps an explicit escape hatch for controlled local
 * production-mode testing without enabling the tools on Vercel.
 */
export function isLocalToolRuntime(): boolean {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return false;
  return process.env.NODE_ENV === 'development' || process.env.ALLOW_LOCAL_TOOLS === 'true';
}
