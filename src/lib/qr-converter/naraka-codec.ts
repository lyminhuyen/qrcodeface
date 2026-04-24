/**
 * Naraka Codec
 * Encode/decode Naraka: Bladepoint face data
 *
 * Format: "NARAKA-FACEHAIR-" + Base64(LZMA(JSON))
 * Note: Naraka uses a modified LZMA header (duplicated size bytes)
 */

import { compress, decompress } from 'lzma1';
import * as QRCode from 'qrcode';
import type { RawNarakaData, ConvertResult } from './types';

const CODE_PREFIX = 'NARAKA-FACEHAIR-';

/**
 * Decode QR string to RawNarakaData
 */
export function decodeNarakaString(codeString: string): RawNarakaData {
  // Remove prefix if present
  if (codeString.startsWith(CODE_PREFIX)) {
    codeString = codeString.slice(CODE_PREFIX.length);
  }

  // Base64 decode
  const binaryString = atob(codeString);
  const rawBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    rawBytes[i] = binaryString.charCodeAt(i);
  }

  // Restore standard LZMA header (Naraka duplicates bytes 5-8 at 9-12)
  // We need to zero out the duplicate to make it valid LZMA
  const standardHeaderBuffer = new Uint8Array(rawBytes.length);
  standardHeaderBuffer.set(rawBytes.subarray(0, 9), 0);
  standardHeaderBuffer.set([0, 0, 0, 0], 9);  // Zero out duplicate
  standardHeaderBuffer.set(rawBytes.subarray(13), 13);

  // Decompress
  const decompressedBytes = decompress(standardHeaderBuffer);
  const textDecoder = new TextDecoder();
  const jsonString = textDecoder.decode(new Uint8Array(decompressedBytes));

  return JSON.parse(jsonString);
}

/**
 * Encode RawNarakaData to QR string
 */
export function encodeNarakaString(data: RawNarakaData): string {
  const jsonString = JSON.stringify(data);
  const textEncoder = new TextEncoder();
  const dataBytes = textEncoder.encode(jsonString);

  // Compress using LZMA (level 5)
  const compressed = compress(dataBytes, 5);

  // Standard LZMA header: 5 bytes props + 8 bytes size (low 4 + high 4)
  // Naraka format: 5 bytes props + 4 bytes size + 4 bytes size (duplicate) + data
  // So we need to remove 4 bytes (the high 4 of the 8-byte size, which are zeros)
  // Then duplicate the low 4 bytes

  // Result size: compressed.length - 4 (remove high size bytes) + 4 (duplicate low) = same
  // But the content is different!

  const narakaBuffer = new Uint8Array(compressed.length);
  narakaBuffer.set(compressed.subarray(0, 5), 0);  // Props (5 bytes)

  const sizeLow = compressed.subarray(5, 9);       // Low 4 bytes of size
  narakaBuffer.set(sizeLow, 5);                    // Size at position 5-8
  narakaBuffer.set(sizeLow, 9);                    // Duplicate at position 9-12

  // Skip the high 4 bytes of size (index 9-12 in standard LZMA, which are zeros)
  // Copy compressed data starting from index 13 to position 13
  narakaBuffer.set(compressed.subarray(13), 13);

  // Base64 encode
  const binaryString = Array.from(narakaBuffer)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  const base64 = btoa(binaryString);

  return CODE_PREFIX + base64;
}

/**
 * Generate QR code image as data URL
 */
export async function generateQRDataUrl(data: RawNarakaData): Promise<string> {
  const codeString = encodeNarakaString(data);
  console.log('[QR Converter] Encoded string length:', codeString.length);
  console.log('[QR Converter] Encoded string preview:', codeString.substring(0, 100));

  // Verify round-trip
  try {
    const decoded = decodeNarakaString(codeString);
    console.log('[QR Converter] Round-trip verification - HeroID:', decoded.hairData?.HeroID);
  } catch (e) {
    console.error('[QR Converter] Round-trip FAILED:', e);
  }

  return await QRCode.toDataURL(codeString, {
    errorCorrectionLevel: 'L',  // Lower error correction = smaller QR = easier to scan
    margin: 2,
    width: 512,
  });
}

/**
 * Full conversion: QR string → re-encoded QR image
 * This is used to convert CN QR (which might be URL-based) to Global QR (raw data)
 */
export async function convertQRString(inputString: string): Promise<ConvertResult> {
  try {
    let qrData = inputString;

    // Debug: log what we got from QR
    console.log('[QR Converter] Raw QR content:', inputString.substring(0, 200));

    // Check if it's a URL (CN QRs sometimes contain URLs)
    if (/^https?:\/\//.test(inputString)) {
      console.log('[QR Converter] QR contains URL, fetching via API...');
      // Fetch data via our server-side API to avoid CORS
      try {
        const response = await fetch(`/api/fetch-qr?url=${encodeURIComponent(inputString)}`);
        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to fetch from URL');
        }

        qrData = result.data;
        console.log('[QR Converter] Fetched data:', qrData.substring(0, 200));
      } catch (e) {
        console.error('[QR Converter] Fetch error:', e);
        return {
          success: false,
          error: `QR contains URL but cannot fetch: ${inputString.substring(0, 100)}...`
        };
      }
    }

    // Check if data has expected prefix
    if (!qrData.startsWith(CODE_PREFIX)) {
      console.log('[QR Converter] Data does not have NARAKA prefix');
      return {
        success: false,
        error: `Invalid format. Expected "NARAKA-FACEHAIR-" prefix. Got: "${qrData.substring(0, 50)}..."`
      };
    }

    // Decode the data
    const narakaData = decodeNarakaString(qrData);
    console.log('[QR Converter] Decoded HeroID:', narakaData.hairData?.HeroID);

    // Re-encode to QR image
    const qrDataUrl = await generateQRDataUrl(narakaData);

    return { success: true, qrDataUrl };
  } catch (error) {
    console.error('[QR Converter] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download QR as image file
 */
export function downloadQR(dataUrl: string, filename: string = 'naraka-qr-global.png'): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
