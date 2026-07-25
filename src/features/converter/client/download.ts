export function downloadQR(
  dataUrl: string,
  filename: string = 'naraka-qr-global.png',
): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
