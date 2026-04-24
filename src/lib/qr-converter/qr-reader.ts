/**
 * QR Code Reader
 * Decode QR codes from images using jsQR
 */

import jsQR from 'jsqr';

/**
 * Read QR code from a File (image)
 */
export async function readQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);
          return;
        }

        canvas.width = image.width;
        canvas.height = image.height;
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        resolve(code ? code.data : null);
      };

      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Read QR code from an image URL
 */
export async function readQRFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(null);
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      resolve(code ? code.data : null);
    };

    image.onerror = () => reject(new Error('Failed to load image from URL'));
    image.src = url;
  });
}

/**
 * Read QR code from HTMLCanvasElement
 */
export function readQRFromCanvas(canvas: HTMLCanvasElement): string | null {
  const context = canvas.getContext('2d');
  if (!context) return null;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  return code ? code.data : null;
}
