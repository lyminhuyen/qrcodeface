'use client';

import { useState, useRef } from 'react';
import { convertFromFile, convertFromUrl, downloadQR } from '@/lib/qr-converter';

export default function ConverterPage() {
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">QR Converter</h1>
        <p className="text-gray-400 mb-8">Convert CN QR codes to Global format</p>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload QR Image</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer file:disabled:opacity-50"
          />
        </div>

        {/* URL Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Or paste image URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com/qr-image.png"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 rounded border border-gray-600
                focus:outline-none focus:border-blue-500
                disabled:opacity-50"
            />
            <button
              onClick={handleUrlConvert}
              disabled={loading || !inputUrl.trim()}
              className="px-6 py-2 bg-blue-600 rounded font-semibold
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Convert
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-400">Converting...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Result */}
        {resultQR && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Conversion Successful!</h2>
            <div className="flex flex-col items-center gap-4">
              <img
                src={resultQR}
                alt="Converted QR Code"
                className="w-64 h-64 bg-white rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-green-600 rounded font-semibold hover:bg-green-700"
                >
                  Download QR
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-gray-600 rounded font-semibold hover:bg-gray-700"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>This tool converts Naraka: Bladepoint QR codes from CN server format to Global format.</p>
          <p className="mt-2">The conversion happens entirely in your browser - no data is sent to any server.</p>
        </div>
      </div>
    </div>
  );
}
