'use client';

import Gallery from '@/components/Gallery';
import Menubar from '@/components/Menubar';
import Footer from '@/components/Footer';
import charactersData from '@/data/characters.json';
import { CharactersData } from '@/types';

export default function GalleryPage() {
  const characters = (charactersData as CharactersData).characters;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Menubar */}
      <Menubar />

      {/* Gallery */}
      <main className="flex-1">
        <Gallery characters={characters} />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
