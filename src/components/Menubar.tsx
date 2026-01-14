'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, ChevronDown, Menu, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, Locale } from '@/contexts/LanguageContext';

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: 'vi', flag: '🇻🇳', label: 'VI' },
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'zh', flag: '🇨🇳', label: 'ZH' },
];

export default function Menubar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  const navItems = [
    { href: '/gallery', label: t('nav.gallery') },
    { href: '/about', label: t('nav.about') },
  ];

  const isDark = theme === 'dark';

  return (
    <div className="sticky top-0 z-50 w-full p-4">
      <nav
        className={`max-w-6xl mx-auto px-6 py-3 transition-all ${
          isDark
            ? 'bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-full shadow-2xl'
            : 'bg-white border-2 border-purple-400 rounded-xl shadow-lg'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title */}
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                QRCode Face Gallery
              </h1>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Naraka: Bladepoint Face Codes
              </p>
            </div>
          </Link>

          {/* Center: Navigation (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  pathname === item.href
                    ? isDark
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500 text-white'
                    : isDark
                    ? 'text-white/80 hover:bg-white/10 hover:text-white'
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="text-lg">{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.label}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${langOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {langOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setLangOpen(false)}
                  />
                  <div className={`absolute right-0 mt-2 w-32 rounded-xl shadow-xl z-20 overflow-hidden ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLocale(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                          locale === lang.code
                            ? isDark ? 'bg-gray-700' : 'bg-gray-100'
                            : ''
                        } ${
                          isDark
                            ? 'text-gray-200 hover:bg-gray-700'
                            : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-yellow-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-full transition-all ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className={`md:hidden mt-4 pt-4 border-t ${isDark ? 'border-white/20' : 'border-gray-200'}`}>
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all text-center ${
                    pathname === item.href
                      ? isDark
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-500 text-white'
                      : isDark
                      ? 'text-white/80 hover:bg-white/10 hover:text-white'
                      : 'text-gray-700 hover:bg-purple-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
