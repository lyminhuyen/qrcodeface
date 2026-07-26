import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { getPostById } from '@/lib/qrcodes/get-post.server';
import charactersData from '@/data/characters.json';
import type { CharactersData } from '@/types';

export const runtime = 'nodejs';

const characters = (charactersData as CharactersData).characters;

const BRAND = 'QRCode Face Gallery';
const TAGLINE = 'NARAKA: BLADEPOINT · QRCODE FACE';
const SIZE = { width: 1200, height: 630 };

function characterNameEn(characterId: string, fallback: string): string {
  const c = characters.find((ch) => ch.id === characterId);
  return c?.names.en || fallback || 'QRCode Face';
}

// Fetch external image and inline as data URL (Satori can't reliably hotlink
// the CN CDN; doing it here lets us control timeout + fail gracefully).
async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Referer: '' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 5_000_000) return null;
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function card(name: string, imgData: string | null) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '1200px',
        height: '630px',
        backgroundColor: '#0a0a0a',
        backgroundImage:
          'linear-gradient(135deg, #1e3a8a 0%, #0a0a0a 55%, #312e81 100%)',
      }}
    >
      {imgData ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imgData}
          alt=""
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1200px',
            height: '630px',
            objectFit: 'cover',
          }}
        />
      ) : null}

      {/* Bottom gradient for legibility */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex',
          width: '1200px',
          height: '630px',
          backgroundImage:
            'linear-gradient(180deg, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Brand badge */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          right: 60,
          display: 'flex',
          fontSize: 28,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.92)',
        }}
      >
        {BRAND}
      </div>

      {/* Title block */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          bottom: 60,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 2,
            color: '#93c5fd',
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 68,
            fontWeight: 800,
            color: '#ffffff',
            marginTop: 10,
          }}
        >
          {name}
        </div>
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  const char = searchParams.get('char') || '';

  const post = await getPostById(char, id);

  const name = post
    ? characterNameEn(post.characterId, post.characterName)
    : BRAND;

  const imageUrl = post?.images.find((img) => !img.includes('.mp4'));
  const imgData = imageUrl ? await fetchImageDataUrl(imageUrl) : null;

  return new ImageResponse(card(name, imgData), {
    ...SIZE,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
    },
  });
}
