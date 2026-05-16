'use client';

import { useState, useRef } from 'react';
import Menubar from '@/components/Menubar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { convertFromFile, convertFromUrl, downloadQR } from '@/lib/qr-converter';

export default function ConverterPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultQR, setResultQR] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResultQR(null);

    const result = await convertFromFile(file);

    if (result.success && result.qrDataUrl) {
      setResultQR(result.qrDataUrl);
    } else {
      setError(result.error || 'Conversion failed');
    }

    setLoading(false);
  };

  const handleUrlConvert = async () => {
    if (!inputUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResultQR(null);

    const result = await convertFromUrl(inputUrl.trim());

    if (result.success && result.qrDataUrl) {
      setResultQR(result.qrDataUrl);
    } else {
      setError(result.error || 'Conversion failed');
    }

    setLoading(false);
  };

  const handleDownload = () => {
    if (resultQR) {
      downloadQR(resultQR, 'naraka-qr-global.png');
    }
  };

  const handleReset = () => {
    setResultQR(null);
    setError(null);
    setInputUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 flex flex-col">
      <Menubar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('converter.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {t('converter.subtitle')}
          </p>

          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {t('converter.uploadTitle')}
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={loading}
              className="block w-full text-sm text-gray-600 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-purple-600 file:text-white
                hover:file:bg-purple-700
                file:cursor-pointer file:disabled:opacity-50"
            />
          </div>

          {/* URL Section */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {t('converter.urlTitle')}
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/qr-image.png"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600
                  text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  disabled:opacity-50"
              />
              <button
                onClick={handleUrlConvert}
                disabled={loading || !inputUrl.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold
                  hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('converter.convert')}
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('converter.converting')}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Result */}
          {resultQR && (
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4">
                {t('converter.success')}
              </h2>
              <div className="flex flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultQR}
                  alt="Converted QR Code"
                  className="w-64 h-64 bg-white rounded-lg shadow"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    {t('converter.download')}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('converter.reset')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-500">
            <p>{t('converter.info1')}</p>
            <p className="mt-2">{t('converter.info2')}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
