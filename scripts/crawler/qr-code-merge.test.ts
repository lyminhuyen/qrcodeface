import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeQRCodeImages } from './qr-code-merge';
import type { QRCodeImage } from './types';

const native: QRCodeImage = {
  imgName: 'Native QR',
  imgBtn: 'Import',
  imgUrl: 'https://example.com/native.jpeg',
  url: 'https://q.example/native',
};
const oldComment: QRCodeImage = {
  imgName: 'Old comment QR',
  imgBtn: 'Open',
  imgUrl: 'https://example.com/old.jpeg',
  url: 'https://example.com/old.jpeg',
  source: 'author-comment',
};
const newComment: QRCodeImage = {
  imgName: 'New comment QR',
  imgBtn: 'Open',
  imgUrl: 'https://example.com/new.jpeg',
  url: 'https://example.com/new.jpeg',
  source: 'author-comment',
};

test('failed or skipped comment scan preserves existing comment assets', () => {
  assert.deepEqual(mergeQRCodeImages([native, oldComment], [native], false), [
    native,
    oldComment,
  ]);
});

test('complete comment scan replaces existing comment assets', () => {
  assert.deepEqual(mergeQRCodeImages([native, oldComment], [native, newComment], true), [
    native,
    newComment,
  ]);
  assert.deepEqual(mergeQRCodeImages([native, oldComment], [native], true), [native]);
});

test('deduplication is scoped to a post and prefers native metadata', () => {
  const duplicateComment = {
    ...oldComment,
    imgUrl: native.imgUrl,
    url: native.imgUrl,
  };
  assert.deepEqual(mergeQRCodeImages([], [native, duplicateComment], true), [native]);
});
