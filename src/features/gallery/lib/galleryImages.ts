import type { QRCode } from '@/types';

export interface GalleryImage {
  url: string;
  source: 'post' | 'author-comment';
}

export function getGalleryImages(qrcode: QRCode): GalleryImage[] {
  const images: GalleryImage[] = [];
  const seen = new Set<string>();

  const add = (url: string | undefined, source: GalleryImage['source']) => {
    const normalizedUrl = url?.trim();
    if (!normalizedUrl || normalizedUrl.includes('.mp4') || seen.has(normalizedUrl)) return;
    seen.add(normalizedUrl);
    images.push({ url: normalizedUrl, source });
  };

  for (const imageUrl of qrcode.images) add(imageUrl, 'post');
  for (const qrCode of qrcode.qrCodes) {
    if (qrCode.source === 'author-comment') add(qrCode.imgUrl, 'author-comment');
  }

  return images;
}
