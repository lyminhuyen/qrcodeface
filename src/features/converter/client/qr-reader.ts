import jsQR from 'jsqr';

function readQRFromImage(image: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  canvas.width = image.width;
  canvas.height = image.height;
  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height)?.data ?? null;
}

export async function readQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => resolve(readQRFromImage(image));
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function readQRFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(readQRFromImage(image));
    image.onerror = () => reject(new Error('Failed to load image from URL'));
    image.src = url;
  });
}
