/**
 * QR Converter for Naraka: Bladepoint
 *
 * Convert CN server QR codes to Global server format
 *
 * Usage:
 *   import { convertFromFile, convertFromUrl } from '@/lib/qr-converter';
 *
 *   // From file upload
 *   const result = await convertFromFile(file);
 *   if (result.success) downloadQR(result.qrDataUrl);
 *
 *   // From image URL
 *   const result = await convertFromUrl(imageUrl);
 *   if (result.success) downloadQR(result.qrDataUrl);
 */

export * from './types';
export * from './qr-reader';
export * from './naraka-codec';

import { readQRFromFile, readQRFromUrl } from './qr-reader';
import { convertQRString, downloadQR } from './naraka-codec';
import type { ConvertResult } from './types';

/**
 * Convert QR from uploaded file
 */
export async function convertFromFile(file: File): Promise<ConvertResult> {
  try {
    const qrString = await readQRFromFile(file);
    if (!qrString) {
      return { success: false, error: 'Could not read QR code from image' };
    }
    return await convertQRString(qrString);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process file',
    };
  }
}

/**
 * Convert QR from image URL
 */
export async function convertFromUrl(url: string): Promise<ConvertResult> {
  try {
    const qrString = await readQRFromUrl(url);
    if (!qrString) {
      return { success: false, error: 'Could not read QR code from image' };
    }
    return await convertQRString(qrString);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process URL',
    };
  }
}

export { downloadQR };
