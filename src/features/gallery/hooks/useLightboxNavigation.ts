'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QRCode } from '@/types';

interface LightboxNavigationOptions {
  qrcode: QRCode;
  qrcodes: QRCode[];
  imageCount: number;
  onClose: () => void;
  onNavigate: (qrcode: QRCode) => void;
}

export function useLightboxNavigation({
  qrcode,
  qrcodes,
  imageCount,
  onClose,
  onNavigate,
}: LightboxNavigationOptions) {
  const [imagePosition, setImagePosition] = useState({ postId: qrcode.id, index: 0 });
  const currentImageIndex = imagePosition.postId === qrcode.id ? imagePosition.index : 0;
  const currentPostIndex = qrcodes.findIndex((item) => item.id === qrcode.id);

  const previousImage = useCallback(() => {
    if (imageCount === 0) return;
    setImagePosition({
      postId: qrcode.id,
      index: currentImageIndex > 0 ? currentImageIndex - 1 : imageCount - 1,
    });
  }, [currentImageIndex, imageCount, qrcode.id]);

  const nextImage = useCallback(() => {
    if (imageCount === 0) return;
    setImagePosition({
      postId: qrcode.id,
      index: currentImageIndex < imageCount - 1 ? currentImageIndex + 1 : 0,
    });
  }, [currentImageIndex, imageCount, qrcode.id]);

  const previousPost = useCallback(() => {
    if (qrcodes.length === 0) return;
    const target = currentPostIndex > 0 ? currentPostIndex - 1 : qrcodes.length - 1;
    onNavigate(qrcodes[target]);
  }, [currentPostIndex, onNavigate, qrcodes]);

  const nextPost = useCallback(() => {
    if (qrcodes.length === 0) return;
    const target = currentPostIndex < qrcodes.length - 1 ? currentPostIndex + 1 : 0;
    onNavigate(qrcodes[target]);
  }, [currentPostIndex, onNavigate, qrcodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') previousImage();
      if (event.key === 'ArrowRight') nextImage();
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        previousPost();
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextPost();
      }
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, nextPost, onClose, previousImage, previousPost]);

  return {
    currentImageIndex,
    currentPostIndex,
    previousImage,
    nextImage,
  };
}
