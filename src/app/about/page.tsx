'use client';

import Menubar from '@/components/Menubar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Menubar */}
      <Menubar />

      {/* Main Content */}
      <main className="flex-1 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {t('about.title')}
          </h1>

          <div className="prose prose-lg dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('about.description')}
            </p>

            <div className="mt-8 p-6 bg-white dark:bg-gray-900/50 rounded-xl shadow-lg border dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Features
              </h2>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">✓</span>
                  Browse Face Codes by character
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">✓</span>
                  Filter and search QR codes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">✓</span>
                  Download QR codes for use in game
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">✓</span>
                  Dark mode support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-500">✓</span>
                  Multi-language (Vietnamese, English, Chinese)
                </li>
              </ul>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl text-white">
              <h2 className="text-xl font-semibold mb-2">Naraka: Bladepoint</h2>
              <p className="text-white/80 text-sm">
                Naraka: Bladepoint is a multiplayer action battle royale game developed by 24 Entertainment.
                The game features a character customization system where players can use QR codes to import face designs.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
