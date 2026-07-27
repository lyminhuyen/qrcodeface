import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGalleryAuthorIndex, countAuthors } from '../../src/lib/qrcodes/author-identity';
import type { QRCode } from '../../src/types';

function createQRCode(overrides: Partial<QRCode>): QRCode {
  return {
    id: 'post-1',
    createTime: 1,
    createDate: '2026-07-16',
    characterId: 'diverse',
    characterName: 'Diverse',
    images: [],
    qrCodes: [],
    text: '',
    ...overrides,
  };
}

test('same userId stays one author after a display-name change', () => {
  const older = createQRCode({ id: 'older', userId: 'user-1', userName: 'Old name' });
  const newer = createQRCode({
    id: 'newer',
    userId: 'user-1',
    userName: 'New name',
    userAvatar: 'new-avatar.png',
    createTime: 2,
  });

  const index = buildGalleryAuthorIndex([older, newer]);

  assert.equal(index.authors.length, 1);
  assert.deepEqual(index.authors[0], {
    key: 'uid:user-1',
    name: 'New name',
    avatar: 'new-avatar.png',
    count: 2,
  });
  assert.equal(index.authorKeyByQRCodeId.get('older'), 'uid:user-1');
});

test('legacy name-only records join a unique known userId during gradual backfill', () => {
  const legacy = createQRCode({ id: 'legacy', userName: 'Author' });
  const identified = createQRCode({ id: 'identified', userId: 'user-1', userName: 'Author' });

  const index = buildGalleryAuthorIndex([legacy, identified]);

  assert.equal(index.authors.length, 1);
  assert.equal(index.authors[0]?.count, 2);
  assert.equal(index.authorKeyByQRCodeId.get('legacy'), 'uid:user-1');
  assert.equal(countAuthors([legacy, identified]), 1);
});

test('different userIds with the same display name remain separate authors', () => {
  const first = createQRCode({ id: 'first', userId: 'user-1', userName: 'Same name' });
  const second = createQRCode({ id: 'second', userId: 'user-2', userName: 'Same name' });

  const index = buildGalleryAuthorIndex([first, second]);

  assert.equal(index.authors.length, 2);
  assert.notEqual(
    index.authorKeyByQRCodeId.get('first'),
    index.authorKeyByQRCodeId.get('second')
  );
});
