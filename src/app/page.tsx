'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Menubar from '@/components/Menubar';
import FeaturedCard from '@/components/FeaturedCard';
import Footer from '@/components/Footer';
import charactersData from '@/data/characters.json';
import { QRCode, QRCodesData, CharactersData } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Cache for loaded data
const dataCache: Record<string, QRCode[]> = {};

export default function Home() {
  const { t } = useLanguage();
  const characters = (charactersData as CharactersData).characters;
  const [qrcodes, setQrcodes] = useState<QRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load newest data from all characters
  useEffect(() => {
    const loadData = async () => {
      if (dataCache['__home__']) {
        setQrcodes(dataCache['__home__']);
        setIsLoading(false);
        return;
      }

      const allQrcodes: QRCode[] = [];
      const charsWithData = characters;

      const promises = charsWithData.map(async (char) => {
        try {
          const data: QRCodesData = await import(`@/data/qrcodes/${char.id}.json`);
          return data.qrcodes || [];
        } catch {
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(data => allQrcodes.push(...data));

      // Sort by createTime DESC
      const sorted = allQrcodes.sort((a, b) => b.createTime - a.createTime);
      dataCache['__home__'] = sorted;
      setQrcodes(sorted);
      setIsLoading(false);
    };

    loadData();
  }, [characters]);

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
              {qrcodes.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.qrcodes')}</p>
          </div>
          <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl backdrop-blur">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {characters.length}
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
        {isLoading ? (
          <div className="w-full max-w-4xl mx-auto px-4 text-center py-12">
            <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </div>
          </div>
        ) : (
          <FeaturedCard qrcodes={qrcodes} characters={characters} />
        )}
      </section>

      <Footer />
    </div>
  );
}
