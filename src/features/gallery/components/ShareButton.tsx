'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { QRCode } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildShareUrl } from '@/features/gallery/lib/gallery-links';

interface ShareButtonProps {
  qrcode: QRCode;
}

export default function ShareButton({ qrcode }: ShareButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareUrl = buildShareUrl(qrcode);
  const shareText = `${qrcode.characterName} · QRCode Face Gallery`;

  // Close on click-outside / Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers / insecure context
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const openShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    setOpen(false);
  };

  const socials: { key: string; label: string; href: string; icon: React.ReactNode }[] = [
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
        </svg>
      ),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.94 4.64a1.2 1.2 0 0 0-1.62-1.16L2.9 10.3c-1.05.42-1.04 1.02-.18 1.28l4.6 1.44 1.78 5.6c.2.55.1.77.68.77.45 0 .65-.2.9-.45l2.18-2.12 4.54 3.35c.84.46 1.43.22 1.64-.77l2.9-13.7Zm-5.3 3.13-8.4 5.3-1.46-.45 10.06-6.34c.46-.27.88-.12.53.18Z" />
        </svg>
      ),
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z" />
        </svg>
      ),
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('share.button')}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 text-white min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {t('share.button')}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('share.button')}
          className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 bg-gray-800 rounded-lg shadow-xl w-48 p-1 z-50"
        >
          {/* Copy link */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm w-full text-left min-h-[44px] hover:bg-gray-700 ${copied ? 'text-green-400' : 'text-white'}`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span aria-live="polite">{t('share.copied')}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.828-6.828l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />
                </svg>
                <span>{t('share.copyLink')}</span>
              </>
            )}
          </button>

          {/* Social */}
          {socials.map((s) => (
            <button
              key={s.key}
              type="button"
              role="menuitem"
              onClick={() => openShare(s.href)}
              aria-label={`${t('share.button')} – ${s.label}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white w-full text-left min-h-[44px] hover:bg-gray-700"
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
