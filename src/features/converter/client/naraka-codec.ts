import { compress, decompress } from 'lzma1';
import * as QRCode from 'qrcode';
import type { ConvertResult, RawNarakaData } from '../shared/types';

const CODE_PREFIX = 'NARAKA-FACEHAIR-';

function base64Decode(value: string): Uint8Array {
  const binaryString = atob(value);
  const bytes = new Uint8Array(binaryString.length);
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
}

export function decodeNarakaString(codeString: string): RawNarakaData {
  const encoded = codeString.startsWith(CODE_PREFIX)
    ? codeString.slice(CODE_PREFIX.length)
    : codeString;
  const rawBytes = base64Decode(encoded);

  const standardHeaderBuffer = new Uint8Array(rawBytes.length);
  standardHeaderBuffer.set(rawBytes.subarray(0, 9), 0);
  standardHeaderBuffer.set([0, 0, 0, 0], 9);
  standardHeaderBuffer.set(rawBytes.subarray(13), 13);

  const decompressedBytes = decompress(standardHeaderBuffer);
  const jsonString = new TextDecoder().decode(new Uint8Array(decompressedBytes));
  return JSON.parse(jsonString) as RawNarakaData;
}

export function encodeNarakaString(data: RawNarakaData): string {
  const dataBytes = new TextEncoder().encode(JSON.stringify(data));
  const compressed = compress(dataBytes, 5);
  const narakaBuffer = new Uint8Array(compressed.length);

  narakaBuffer.set(compressed.subarray(0, 5), 0);
  const sizeLow = compressed.subarray(5, 9);
  narakaBuffer.set(sizeLow, 5);
  narakaBuffer.set(sizeLow, 9);
  narakaBuffer.set(compressed.subarray(13), 13);

  return CODE_PREFIX + base64Encode(narakaBuffer);
}

async function generateQRDataUrl(data: RawNarakaData): Promise<string> {
  return QRCode.toDataURL(encodeNarakaString(data), {
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 512,
  });
}

export async function convertQRString(inputString: string): Promise<ConvertResult> {
  try {
    if (!inputString.startsWith(CODE_PREFIX)) {
      return {
        success: false,
        error: `Invalid format. Expected "${CODE_PREFIX}" prefix.`,
      };
    }

    const narakaData = decodeNarakaString(inputString);
    return { success: true, qrDataUrl: await generateQRDataUrl(narakaData) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
