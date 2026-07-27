import assert from 'node:assert/strict';
import test from 'node:test';
import { applyProfileAvatar, selectProfileAvatar } from './profile-user';
import type { UserInfoMap } from './types';

test('profile avatar prefers the original data-url over the resized img src', () => {
  assert.equal(
    selectProfileAvatar({
      dataUrl: 'https://ok.166.net/original.jpeg',
      imageSrc: 'https://img.166.net/resized.jpeg?thumbnail=100y100',
    }),
    'https://ok.166.net/original.jpeg'
  );
});

test('profile avatar overrides stale API icon and preserves nickname', () => {
  const userInfos: UserInfoMap = {
    'user-1': {
      user: { uid: 'user-1', nick: 'Author', icon: 'https://example.com/old.jpeg' },
    },
  };

  assert.equal(applyProfileAvatar(userInfos, 'user-1', 'https://example.com/new.jpeg'), true);
  assert.deepEqual(userInfos['user-1'], {
    user: { uid: 'user-1', nick: 'Author', icon: 'https://example.com/new.jpeg' },
  });
});

test('empty DOM avatar does not erase API user info', () => {
  const userInfos: UserInfoMap = {
    'user-1': {
      user: { uid: 'user-1', nick: 'Author', icon: 'https://example.com/api.jpeg' },
    },
  };

  assert.equal(applyProfileAvatar(userInfos, 'user-1', '  '), false);
  assert.equal(userInfos['user-1']?.user.icon, 'https://example.com/api.jpeg');
});
