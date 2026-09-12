import type {
  ActionResult,
  AdminUserSummary,
  AuthEvaluationAdapter,
  Favorite,
  ProviderReadiness,
  SessionPrincipal,
  TotpEnrollment,
} from '../domain';

function missingMessage(readiness: ProviderReadiness): string {
  return `Setup required: ${readiness.missingEnvironment.join(', ')}`;
}

export function createUnconfiguredAdapter(readiness: ProviderReadiness): AuthEvaluationAdapter {
  const result = <T = undefined>(): ActionResult<T> => ({ ok: false, message: missingMessage(readiness) });
  return {
    readiness: () => readiness,
    getSession: async (): Promise<SessionPrincipal | null> => null,
    signUp: async () => result(),
    signIn: async () => result(),
    signOut: async () => result(),
    requestPasswordReset: async () => result(),
    listFavorites: async (): Promise<ActionResult<Favorite[]>> => result(),
    setFavorite: async () => result(),
    listUsers: async (): Promise<ActionResult<AdminUserSummary[]>> => result(),
    mutateUser: async () => result(),
    beginTotpEnrollment: async (): Promise<ActionResult<TotpEnrollment>> => result(),
    verifyTotp: async () => result(),
  };
}
