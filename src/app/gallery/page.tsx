import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Gallery from '@/features/gallery/components/Gallery';
import Menubar from '@/components/layout/Menubar';
import Footer from '@/components/layout/Footer';
import charactersData from '@/data/characters.json';
import { CharactersData } from '@/types';
import { getPostById } from '@/lib/qrcodes/get-post.server';

const characters = (charactersData as CharactersData).characters;

function characterNameEn(characterId: string, fallback: string): string {
  const c = characters.find((ch) => ch.id === characterId);
  return c?.names.en || fallback || 'QRCode Face';
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const id = typeof sp.id === 'string' ? sp.id : undefined;
  const char = typeof sp.char === 'string' ? sp.char : undefined;
  if (!id || !char) return {};

  const post = await getPostById(char, id);
  if (!post) return {};

  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  const base = host ? `${proto}://${host}` : '';

  const name = characterNameEn(post.characterId, post.characterName);
  const title = `${name} — QRCode Face`;
  const description =
    (post.text && post.text.replace(/\s+/g, ' ').trim().slice(0, 160)) ||
    'Face Code Collection for Naraka: Bladepoint';
  const ogImage = `${base}/api/og?id=${encodeURIComponent(id)}&char=${encodeURIComponent(char)}`;
  const pageUrl = `${base}/gallery?id=${encodeURIComponent(id)}&char=${encodeURIComponent(char)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Menubar */}
      <Menubar />

      {/* Gallery */}
      <main className="flex-1">
        <Suspense fallback={null}>
          <Gallery characters={characters} />
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
