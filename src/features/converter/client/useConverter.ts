'use client';

import { useRef, useState } from 'react';
import { convertQRString } from './naraka-codec';
import { readQRFromFile, readQRFromUrl } from './qr-reader';
import { downloadQR } from './download';

async function resolveQRCodeData(qrString: string): Promise<string> {
  if (!/^https?:\/\//.test(qrString)) return qrString;

  const response = await fetch(`/api/fetch-qr?url=${encodeURIComponent(qrString)}`);
  const result = await response.json() as { data?: string; error?: string };
  if (!response.ok || result.error || !result.data) {
    throw new Error(result.error || 'Failed to fetch QR data from URL');
  }
  return result.data;
}

export function useConverter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultQR, setResultQR] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runConversion = async (readQRCode: () => Promise<string | null>) => {
    setLoading(true);
    setError(null);
    setResultQR(null);

    try {
      const scannedValue = await readQRCode();
      if (!scannedValue) throw new Error('Could not read QR code from image');

      const qrString = await resolveQRCodeData(scannedValue);
      const result = await convertQRString(qrString);
      if (!result.success || !result.qrDataUrl) {
        throw new Error(result.error || 'Conversion failed');
      }
      setResultQR(result.qrDataUrl);
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await runConversion(() => readQRFromFile(file));
  };

  const handleUrlConvert = async () => {
    const url = inputUrl.trim();
    if (url) await runConversion(() => readQRFromUrl(url));
  };

  const handleDownload = () => {
    if (resultQR) downloadQR(resultQR);
  };

  const handleReset = () => {
    setResultQR(null);
    setError(null);
    setInputUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    loading,
    error,
    resultQR,
    inputUrl,
    setInputUrl,
    fileInputRef,
    handleFileUpload,
    handleUrlConvert,
    handleDownload,
    handleReset,
  };
}
