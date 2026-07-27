import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  backfillAuthorProfileAcrossShards,
  loadKnownCommentAuthorIds,
  mergeQRCodesIntoShards,
} from './data-store';
import type { Character, ParsedQRCode } from './types';

const character: Character = {
  id: 'diverse',
  names: { en: 'Diverse', zh: '多角色', vi: 'Đa nhân vật' },
  topicTag: null,
};

function createQRCode(overrides: Partial<ParsedQRCode> = {}): ParsedQRCode {
  return {
    id: 'post-1',
    createTime: 1,
    createDate: '2026-07-16',
    characterId: 'diverse',
    characterName: 'Diverse',
    images: ['image.jpeg'],
    qrCodes: [],
    text: '',
    userName: 'Existing author',
    userAvatar: 'existing-avatar.png',
    ...overrides,
  };
}

test('recrawl backfills userId without erasing existing author metadata', async () => {
  const qrcodesDir = await fs.mkdtemp(path.join(tmpdir(), 'qrcodeface-authors-'));
  const filePath = path.join(qrcodesDir, 'diverse.json');

  try {
    await fs.writeFile(
      filePath,
      JSON.stringify({
        lastUpdated: new Date(0).toISOString(),
        totalCount: 1,
        qrcodes: [createQRCode()],
      })
    );

    await mergeQRCodesIntoShards(
      qrcodesDir,
      [createQRCode({ userId: 'user-1', userName: '', userAvatar: '' })],
      [character]
    );

    const output = JSON.parse(await fs.readFile(filePath, 'utf8')) as {
      qrcodes: ParsedQRCode[];
    };
    assert.equal(output.qrcodes[0]?.userId, 'user-1');
    assert.equal(output.qrcodes[0]?.userName, 'Existing author');
    assert.equal(output.qrcodes[0]?.userAvatar, 'existing-avatar.png');
  } finally {
    await fs.rm(qrcodesDir, { recursive: true, force: true });
  }
});

test('known comment authors are learned from canonical enrichment history', async () => {
  const qrcodesDir = await fs.mkdtemp(path.join(tmpdir(), 'qrcodeface-comment-authors-'));

  try {
    await fs.writeFile(
      path.join(qrcodesDir, 'diverse.json'),
      JSON.stringify({
        lastUpdated: new Date(0).toISOString(),
        totalCount: 2,
        qrcodes: [
          createQRCode({
            id: 'comment-post',
            userId: 'comment-author',
            qrCodes: [
              {
                imgName: 'Comment QR',
                imgBtn: 'Open',
                imgUrl: 'comment.jpeg',
                url: 'comment.jpeg',
                source: 'author-comment',
              },
            ],
          }),
          createQRCode({ id: 'native-post', userId: 'native-author' }),
        ],
      })
    );

    const authorIds = await loadKnownCommentAuthorIds(qrcodesDir);

    assert.deepEqual([...authorIds], ['comment-author']);
  } finally {
    await fs.rm(qrcodesDir, { recursive: true, force: true });
  }
});

test('explicit author profile updates legacy name-only records across shards', async () => {
  const qrcodesDir = await fs.mkdtemp(path.join(tmpdir(), 'qrcodeface-profile-backfill-'));

  try {
    await Promise.all(
      ['first.json', 'second.json'].map((file, index) =>
        fs.writeFile(
          path.join(qrcodesDir, file),
          JSON.stringify({
            lastUpdated: new Date(0).toISOString(),
            totalCount: 1,
            qrcodes: [
              createQRCode({
                id: `post-${index}`,
                userName: 'Author',
                userAvatar: 'old-avatar.jpeg',
              }),
            ],
          })
        )
      )
    );

    const result = await backfillAuthorProfileAcrossShards(qrcodesDir, {
      userId: 'user-1',
      userName: 'Author',
      userAvatar: 'new-avatar.jpeg',
    });
    const first = JSON.parse(await fs.readFile(path.join(qrcodesDir, 'first.json'), 'utf8')) as {
      qrcodes: ParsedQRCode[];
    };

    assert.deepEqual(result, { updatedRecords: 2, updatedShards: 2, nameFallbackUsed: true });
    assert.equal(first.qrcodes[0]?.userId, 'user-1');
    assert.equal(first.qrcodes[0]?.userAvatar, 'new-avatar.jpeg');
  } finally {
    await fs.rm(qrcodesDir, { recursive: true, force: true });
  }
});

test('legacy name fallback is disabled when the display name maps to another userId', async () => {
  const qrcodesDir = await fs.mkdtemp(path.join(tmpdir(), 'qrcodeface-profile-conflict-'));
  const filePath = path.join(qrcodesDir, 'diverse.json');

  try {
    await fs.writeFile(
      filePath,
      JSON.stringify({
        lastUpdated: new Date(0).toISOString(),
        totalCount: 3,
        qrcodes: [
          createQRCode({ id: 'legacy', userName: 'Same name', userId: undefined }),
          createQRCode({ id: 'other', userName: 'Same name', userId: 'user-2' }),
          { ...createQRCode({ id: 'missing-name' }), userName: undefined },
        ],
      })
    );

    const result = await backfillAuthorProfileAcrossShards(qrcodesDir, {
      userId: 'user-1',
      userName: 'Same name',
      userAvatar: 'new-avatar.jpeg',
    });
    const output = JSON.parse(await fs.readFile(filePath, 'utf8')) as {
      qrcodes: ParsedQRCode[];
    };

    assert.deepEqual(result, { updatedRecords: 0, updatedShards: 0, nameFallbackUsed: false });
    assert.equal(output.qrcodes.find((qrcode) => qrcode.id === 'legacy')?.userId, undefined);
  } finally {
    await fs.rm(qrcodesDir, { recursive: true, force: true });
  }
});

test('idempotent recrawl does not churn shard lastUpdated', async () => {
  const qrcodesDir = await fs.mkdtemp(path.join(tmpdir(), 'qrcodeface-idempotent-'));
  const filePath = path.join(qrcodesDir, 'diverse.json');
  const lastUpdated = new Date(0).toISOString();

  try {
    await fs.writeFile(
      filePath,
      JSON.stringify({
        lastUpdated,
        source: 'diverse',
        totalCount: 1,
        qrcodes: [createQRCode()],
      })
    );

    await mergeQRCodesIntoShards(qrcodesDir, [createQRCode()], [character]);
    const output = JSON.parse(await fs.readFile(filePath, 'utf8')) as QRCodeShardForTest;

    assert.equal(output.lastUpdated, lastUpdated);
  } finally {
    await fs.rm(qrcodesDir, { recursive: true, force: true });
  }
});

interface QRCodeShardForTest {
  lastUpdated: string;
}
