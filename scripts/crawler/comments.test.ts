import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAuthorCommentQRCode,
  getCommentScanPriority,
  hasStrongCommentHint,
  shouldScanComments,
} from './comments';
import type { Feed, ParsedQRCode } from './types';

const NOW = Date.UTC(2026, 6, 16);

function createFeed(overrides: Partial<Feed> = {}): Feed {
  return {
    id: 'feed-1',
    uid: 'author-1',
    createTime: NOW - 10 * 24 * 60 * 60 * 1000,
    content: JSON.stringify({ body: { text: '', media: [] } }),
    record: { commentCount: 1 },
    ...overrides,
  };
}

function createQRCode(overrides: Partial<ParsedQRCode> = {}): ParsedQRCode {
  return {
    id: 'feed-1',
    createTime: NOW,
    createDate: '2026-07-16',
    characterId: 'diverse',
    characterName: 'Diverse',
    images: ['https://example.com/face.jpeg'],
    qrCodes: [],
    text: '',
    userName: 'Author',
    userAvatar: '',
    ...overrides,
  };
}

test('manual feed ID always selects the requested post', () => {
  assert.equal(
    shouldScanComments({
      enabled: false,
      feed: createFeed({ record: { commentCount: 0 } }),
      qrcode: createQRCode(),
      forcedFeedId: 'feed-1',
      lookbackDays: 45,
      now: NOW,
    }),
    true
  );
});

test('monthly mode scans recent commented posts without native QR metadata', () => {
  assert.equal(
    shouldScanComments({
      enabled: true,
      feed: createFeed(),
      qrcode: createQRCode(),
      lookbackDays: 45,
      now: NOW,
    }),
    true
  );
});

test('monthly mode skips old posts and posts without comments', () => {
  const oldFeed = createFeed({ createTime: NOW - 46 * 24 * 60 * 60 * 1000 });
  const noComments = createFeed({ record: { commentCount: 0 } });
  const policy = { enabled: true, qrcode: createQRCode(), lookbackDays: 45, now: NOW };

  assert.equal(shouldScanComments({ ...policy, feed: oldFeed }), false);
  assert.equal(shouldScanComments({ ...policy, feed: noComments }), false);
});

test('native QR posts require a strong comment hint or known author', () => {
  const nativeQRCode = createQRCode({
    qrCodes: [{ imgName: 'QR', imgBtn: 'Open', url: 'https://q.example/1' }],
  });
  const feed = createFeed();
  const base = { enabled: true, feed, qrcode: nativeQRCode, lookbackDays: 45, now: NOW };

  assert.equal(shouldScanComments(base), false);
  assert.equal(
    shouldScanComments({ ...base, qrcode: { ...nativeQRCode, text: '码在评论区' } }),
    true
  );
  assert.equal(
    shouldScanComments({ ...base, knownAuthorIds: new Set(['author-1']) }),
    true
  );
});

test('known comment authors are prioritized before hints and missing native QR', () => {
  const knownAuthorIds = new Set(['author-1']);
  const nativeQRCode = createQRCode({
    qrCodes: [{ imgName: 'QR', imgBtn: 'Open', url: 'https://q.example/1' }],
  });

  assert.equal(
    getCommentScanPriority({ feed: createFeed(), qrcode: nativeQRCode, knownAuthorIds }),
    3
  );
  assert.equal(
    getCommentScanPriority({
      feed: createFeed({ uid: 'other' }),
      qrcode: { ...nativeQRCode, text: '二维码在评论区' },
      knownAuthorIds,
    }),
    2
  );
  assert.equal(
    getCommentScanPriority({
      feed: createFeed({ uid: 'other' }),
      qrcode: createQRCode(),
      knownAuthorIds,
    }),
    1
  );
});

test('comment hint and synthetic asset keep comment provenance', () => {
  assert.equal(hasStrongCommentHint('发色捏脸同码，评论区见'), true);
  const asset = createAuthorCommentQRCode('https://ok.166.net/path/comment.jpeg');

  assert.equal(asset.source, 'author-comment');
  assert.equal(asset.imgLocalName, 'comment.jpeg');
  assert.equal(asset.imgUrl, asset.url);
});
