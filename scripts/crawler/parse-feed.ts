import type { Feed, MediaItem, QRCodeImage } from './types';

export function extractImages(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.body?.media?.map((media: MediaItem) => media.url) || [];
  } catch {
    return [];
  }
}

export function extractText(content: string): string {
  try {
    return JSON.parse(content).body?.text || '';
  } catch {
    return '';
  }
}

export function extractQRCodes(attributes: Feed['attributeInfoList']): QRCodeImage[] {
  if (!attributes) return [];
  return attributes.find((attribute) => attribute.type === 'QR_CODE')
    ?.externalData?.importQrCodeData?.imgList || [];
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}
