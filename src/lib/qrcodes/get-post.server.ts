import type { QRCode, QRCodesData } from '@/types';

// characterId is a slug like "liu-lian" / "diverse". Validate before using it
// in the dynamic import path.
const CHAR_SLUG = /^[a-z0-9-]+$/;

/**
 * Load a single post by character file + id on the server.
 *
 * Uses a dynamic `import()` (same pattern as Gallery.tsx) instead of fs so the
 * JSON files are bundled/traced into the serverless function on Vercel. The
 * webpack import context only resolves files that exist under data/qrcodes,
 * so an invalid `char` simply throws and is caught.
 */
export async function getPostById(char: string, id: string): Promise<QRCode | null> {
  if (!char || !id || !CHAR_SLUG.test(char)) return null;
  try {
    const data: QRCodesData = await import(`@/data/qrcodes/${char}.json`);
    return data.qrcodes?.find((q) => q.id === id) ?? null;
  } catch {
    return null;
  }
}
