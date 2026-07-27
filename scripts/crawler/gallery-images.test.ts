import assert from 'node:assert/strict';
import test from 'node:test';
import { getGalleryImages } from '../../src/features/gallery/lib/galleryImages';
import type { QRCode } from '../../src/types';

const qrcode: QRCode = {
  id: 'post-1',
  createTime: 1,
  createDate: '2026-07-16',
  characterId: 'diverse',
  characterName: 'Diverse',
  images: ['post.jpeg', 'video.mp4'],
  qrCodes: [
    {
      imgName: 'Comment QR',
      imgBtn: 'Open',
      imgUrl: 'comment.jpeg',
      url: 'comment.jpeg',
      source: 'author-comment',
    },
    {
      imgName: 'Duplicate comment QR',
      imgBtn: 'Open',
      imgUrl: 'post.jpeg',
      url: 'post.jpeg',
      source: 'author-comment',
    },
  ],
  text: '',
};

test('gallery images append author-comment QR assets and remove duplicates', () => {
  assert.deepEqual(getGalleryImages(qrcode), [
    { url: 'post.jpeg', source: 'post' },
    { url: 'comment.jpeg', source: 'author-comment' },
  ]);
});
