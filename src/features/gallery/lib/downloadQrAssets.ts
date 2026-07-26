import type { QRCode } from '@/types';

function triggerDownload(blob: Blob, filename: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
}

async function fetchImage(url: string, timeoutMs?: number): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
    return await response.blob();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function downloadQrAssets(
  qrcode: QRCode,
  images: string[],
  currentImageIndex: number
): Promise<void> {
  const qrImages = qrcode.qrCodes.filter(
    (qrcodeImage) => qrcodeImage.imgUrl && qrcodeImage.imgUrl.trim() !== ''
  );

  if (qrImages.length === 0) {
    const currentImage = images[currentImageIndex];
    if (!currentImage) {
      window.alert('No images available to download');
      return;
    }

    try {
      const blob = await fetchImage(currentImage);
      triggerDownload(blob, `${qrcode.characterName}_QRCode_${Date.now()}.jpg`);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(currentImage, '_blank');
    }
    return;
  }

  for (const [index, qrImage] of qrImages.entries()) {
    const imageUrl = qrImage.imgUrl!;
    try {
      const blob = await fetchImage(imageUrl, 5000);
      const name = qrImage.imgBtn.replace(/[/\\?%*:|"<>]/g, '-');
      triggerDownload(blob, `${qrcode.characterName}_${name}_${Date.now()}.jpg`);
      if (index < qrImages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`Download failed for QR code "${qrImage.imgBtn}":`, error);
      window.open(imageUrl, '_blank');
    }
  }
}
