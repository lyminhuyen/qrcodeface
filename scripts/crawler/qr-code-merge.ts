import type { QRCodeImage } from './types';

export function qrCodeImageKey(image: QRCodeImage): string {
  const imageUrl = image.imgUrl?.trim();
  if (imageUrl) return `image:${imageUrl}`;

  return [
    'link',
    image.url?.trim() ?? '',
    image.imgName?.trim() ?? '',
    image.imgBtn?.trim() ?? '',
  ].join(':');
}

export function dedupeQRCodeImages(images: QRCodeImage[]): QRCodeImage[] {
  const byKey = new Map<string, QRCodeImage>();
  for (const image of images) {
    const key = qrCodeImageKey(image);
    if (!byKey.has(key)) byKey.set(key, image);
  }
  return [...byKey.values()];
}

export function mergeQRCodeImages(
  existing: QRCodeImage[],
  incoming: QRCodeImage[],
  commentScanComplete: boolean
): QRCodeImage[] {
  const incomingNative = incoming.filter((image) => image.source !== 'author-comment');
  const incomingComments = incoming.filter((image) => image.source === 'author-comment');
  const existingComments = existing.filter((image) => image.source === 'author-comment');
  const comments = commentScanComplete
    ? incomingComments
    : dedupeQRCodeImages([...existingComments, ...incomingComments]);

  // Native feed metadata wins when the same image is also present in a comment.
  return dedupeQRCodeImages([...incomingNative, ...comments]);
}
