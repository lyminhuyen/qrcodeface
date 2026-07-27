import assert from 'node:assert/strict';
import test from 'node:test';
import type { GeneratedAuthor } from '../../src/types';
import { selectAuthorsForRefresh } from './author-selector';

function author(overrides: Partial<GeneratedAuthor>): GeneratedAuthor {
  return {
    key: 'uid:user',
    userId: 'user',
    userName: 'Author',
    userAvatar: '',
    postCount: 1,
    latestPostTime: Date.UTC(2026, 6, 16),
    commentQrCount: 0,
    ...overrides,
  };
}

test('author selection is bounded, deterministic and excludes inactive legacy authors', () => {
  const candidates = [
    author({ key: 'uid:a', userId: 'a' }),
    author({ key: 'uid:b', userId: 'b' }),
    author({ key: 'uid:c', userId: 'c' }),
    author({ key: 'name:legacy', userId: undefined }),
    author({ key: 'uid:stale', userId: 'stale', latestPostTime: 1 }),
  ];
  const options = {
    batchSize: 2,
    lookbackDays: 180,
    nowMs: Date.UTC(2026, 6, 17),
    rotationKey: '2026-07-17',
  };

  assert.deepEqual(
    selectAuthorsForRefresh(candidates, options),
    selectAuthorsForRefresh(candidates, options)
  );
  assert.equal(selectAuthorsForRefresh(candidates, options).length, 2);
  assert.ok(selectAuthorsForRefresh(candidates, options).every((item) => item.userId !== 'stale'));
});

test('known comment author remains eligible outside the normal lookback', () => {
  const selected = selectAuthorsForRefresh(
    [
      author({
        key: 'uid:comment',
        userId: 'comment',
        latestPostTime: 1,
        commentQrCount: 1,
      }),
      author({ key: 'uid:active', userId: 'active' }),
    ],
    {
      batchSize: 1,
      lookbackDays: 30,
      nowMs: Date.UTC(2026, 6, 17),
      prioritizeCommentAuthors: true,
      rotationKey: '2026-07-17',
    }
  );

  assert.equal(selected[0]?.userId, 'comment');
});

test('daily cyclic windows cover the stable author order without starvation', () => {
  const candidates = ['a', 'b', 'c', 'd'].map((userId) =>
    author({ key: `uid:${userId}`, userId })
  );
  const common = {
    batchSize: 2,
    lookbackDays: 180,
    nowMs: Date.UTC(2026, 6, 17),
  };
  const first = selectAuthorsForRefresh(candidates, {
    ...common,
    rotationKey: '2026-07-17',
  });
  const second = selectAuthorsForRefresh(candidates, {
    ...common,
    rotationKey: '2026-07-18',
  });

  assert.equal(new Set([...first, ...second].map((item) => item.userId)).size, 4);
});
