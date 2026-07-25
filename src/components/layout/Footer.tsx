'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function SiteFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-8 px-4 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('footer.copyright')} &copy; {year}
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          {t('footer.description')}
        </p>
      </div>
    </footer>
  );
}
