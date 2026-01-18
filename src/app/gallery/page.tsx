'use client';

import Gallery from '@/components/Gallery';
import Menubar from '@/components/Menubar';
import Footer from '@/components/Footer';
import qrcodesData from '@/data/qrcodes/index.json';
import charactersData from '@/data/characters.json';
import { QRCodesData, CharactersData } from '@/types';

export default function GalleryPage() {
  const qrcodes = (qrcodesData as QRCodesData).qrcodes;
  const characters = (charactersData as CharactersData).characters;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Menubar */}
      <Menubar />

      {/* Gallery */}
      <main className="flex-1">
        <Gallery qrcodes={qrcodes} characters={characters} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
