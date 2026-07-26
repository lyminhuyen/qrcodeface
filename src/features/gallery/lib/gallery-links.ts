import type { QRCode } from '@/types';

const GALLERY_PATH = '/gallery';

export function buildGalleryPath(qrcode: Pick<QRCode, 'id' | 'characterId'>): string {
  const params = new URLSearchParams({ id: qrcode.id, char: qrcode.characterId });
  return `${GALLERY_PATH}?${params.toString()}`;
}

export function buildShareUrl(
  qrcode: Pick<QRCode, 'id' | 'characterId'>,
  origin = typeof window !== 'undefined' ? window.location.origin : ''
): string {
  return `${origin}${buildGalleryPath(qrcode)}`;
}
