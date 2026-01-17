'use client';

import Link from 'next/link';
import Menubar from '@/components/Menubar';
import FeaturedCard from '@/components/FeaturedCard';
import Footer from '@/components/Footer';
import qrcodesData from '@/data/qrcodes/index.json';
import charactersData from '@/data/characters.json';
import { QRCodesData, CharactersData } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const qrcodes = (qrcodesData as QRCodesData).qrcodes;
  const characters = (charactersData as CharactersData).characters;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <Menubar />

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {t('hero.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/gallery"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors"
            >
              {t('hero.browseGallery')}
            </Link>
            <Link
              href="/about"
              className="px-6 py-3 border-2 border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full font-medium transition-colors"
            >
              {t('hero.learnMore')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl backdrop-blur">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {qrcodes.filter(q => q.characterId !== 'untagged').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.qrcodes')}</p>
          </div>
          <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl backdrop-blur">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {characters.filter(c => c.id !== 'untagged').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.characters')}</p>
          </div>
          <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl backdrop-blur">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {new Set(qrcodes.map(q => q.createDate)).size}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.days')}</p>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-12 px-4">
        <FeaturedCard qrcodes={qrcodes} characters={characters} />
      </section>

      <Footer />
    </div>
  );
}
