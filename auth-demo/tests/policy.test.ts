import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeAdminMutation, resultingRole, resultingState } from '../lib/policy';

test('admin cannot mutate self', () => {
  const result = authorizeAdminMutation({ actorUserId: 'a', targetUserId: 'a', targetRole: 'admin', targetState: 'active', activeAdminCount: 2 }, 'demote');
  assert.equal(result.allowed, false);
});

test('last active admin cannot be removed', () => {
  const result = authorizeAdminMutation({ actorUserId: 'actor', targetUserId: 'target', targetRole: 'admin', targetState: 'active', activeAdminCount: 1 }, 'suspend');
  assert.equal(result.allowed, false);
});

test('pending deletion account cannot be promoted', () => {
  const result = authorizeAdminMutation({ actorUserId: 'actor', targetUserId: 'target', targetRole: 'user', targetState: 'pending_deletion', activeAdminCount: 2 }, 'promote');
  assert.equal(result.allowed, false);
});

test('role and lifecycle transitions are deterministic', () => {
  assert.equal(resultingRole('user', 'promote'), 'admin');
  assert.equal(resultingRole('admin', 'suspend'), 'admin');
  assert.equal(resultingState('active', 'request_deletion'), 'pending_deletion');
  assert.equal(resultingState('pending_deletion', 'cancel_deletion'), 'active');
});
