import type { AccountRole, AccountState, AdminAccountAction } from './domain';

export interface AccountMutationContext {
  actorUserId: string;
  targetUserId: string;
  targetRole: AccountRole;
  targetState: AccountState;
  activeAdminCount: number;
}

export function authorizeAdminMutation(
  context: AccountMutationContext,
  action: AdminAccountAction,
): { allowed: true } | { allowed: false; reason: string } {
  if (context.actorUserId === context.targetUserId) {
    return { allowed: false, reason: 'Admins cannot mutate their own role or lifecycle.' };
  }

  const removesActiveAdmin =
    context.targetRole === 'admin' &&
    context.targetState === 'active' &&
    (action === 'demote' || action === 'suspend' || action === 'request_deletion');

  if (removesActiveAdmin && context.activeAdminCount <= 1) {
    return { allowed: false, reason: 'The final active admin cannot be removed.' };
  }

  if (context.targetState === 'pending_deletion' && action === 'promote') {
    return { allowed: false, reason: 'An account pending deletion cannot be promoted.' };
  }

  return { allowed: true };
}

export function resultingRole(current: AccountRole, action: AdminAccountAction): AccountRole {
  if (action === 'promote') return 'admin';
  if (action === 'demote') return 'user';
  return current;
}

export function resultingState(current: AccountState, action: AdminAccountAction): AccountState {
  if (action === 'suspend') return 'suspended';
  if (action === 'restore' || action === 'cancel_deletion') return 'active';
  if (action === 'request_deletion') return 'pending_deletion';
  return current;
}
