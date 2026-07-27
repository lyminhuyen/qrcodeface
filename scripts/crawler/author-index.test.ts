import assert from 'node:assert/strict';
import test from 'node:test';
import type { QRCode } from '../../src/types';
import { buildGeneratedAuthors } from './author-index';

function qrcode(overrides: Partial<QRCode>): QRCode {
  return {
    id: 'post',
    createTime: 1,
    createDate: '2026-07-17',
    characterId: 'diverse',
    characterName: 'Diverse',
    images: [],
    qrCodes: [],
    text: '',
    ...overrides,
  };
}

test('generated author uses latest profile and counts comment QR posts', () => {
  const authors = buildGeneratedAuthors([
    qrcode({ id: 'old', userId: 'user-1', userName: 'Old', userAvatar: 'old.png' }),
    qrcode({
      id: 'new',
      userId: 'user-1',
      userName: 'New',
      userAvatar: 'new.png',
      createTime: 2,
      qrCodes: [
        {
          imgName: 'Comment QR',
          imgBtn: 'Open',
          imgUrl: 'comment.png',
          source: 'author-comment',
        },
      ],
    }),
  ]);

  assert.deepEqual(authors, [
    {
      key: 'uid:user-1',
      userId: 'user-1',
      userName: 'New',
      userAvatar: 'new.png',
      postCount: 2,
      latestPostTime: 2,
      commentQrCount: 1,
    },
  ]);
});

test('legacy name joins one known uid but stays separate when the name is ambiguous', () => {
  const authors = buildGeneratedAuthors([
    qrcode({ id: 'legacy-unique', userName: 'Unique' }),
    qrcode({ id: 'identified-unique', userId: 'user-1', userName: 'Unique' }),
    qrcode({ id: 'legacy-shared', userName: 'Shared' }),
    qrcode({ id: 'shared-a', userId: 'user-2', userName: 'Shared' }),
    qrcode({ id: 'shared-b', userId: 'user-3', userName: 'Shared' }),
  ]);

  assert.equal(authors.find((author) => author.key === 'uid:user-1')?.postCount, 2);
  assert.equal(authors.find((author) => author.key === 'name:Shared')?.postCount, 1);
  assert.equal(authors.length, 4);
});

test('profile metadata uses the most frequent non-empty value before latest timestamp', () => {
  const authors = buildGeneratedAuthors([
    qrcode({ id: 'old-1', userId: 'user-1', userAvatar: 'current.png', createTime: 1 }),
    qrcode({ id: 'old-2', userId: 'user-1', userAvatar: 'current.png', createTime: 2 }),
    qrcode({ id: 'latest-stale', userId: 'user-1', userAvatar: 'stale.png', createTime: 3 }),
  ]);

  assert.equal(authors[0]?.userAvatar, 'current.png');
});
