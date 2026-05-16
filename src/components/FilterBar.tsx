'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Character, getCharacterName } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface Author {
  name: string;
  avatar: string;
}

interface FilterBarProps {
  characters: Character[];
  selectedCharacter: string;
  selectedYear: string;
  selectedMonth: string;
  selectedAuthor: string;
  onCharacterChange: (characterId: string) => void;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  onAuthorChange: (author: string) => void;
  availableYears: string[];
  availableMonths: string[];
  availableAuthors: Author[];
}

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function FilterBar({
  characters,
  selectedCharacter,
  selectedYear,
  selectedMonth,
  selectedAuthor,
  onCharacterChange,
  onYearChange,
  onMonthChange,
  onAuthorChange,
  availableYears,
  availableMonths,
  availableAuthors,
}: FilterBarProps) {
  const { t, locale } = useLanguage();
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const authorDropdownRef = useRef<HTMLDivElement>(null);

  const selectedAuthorData = availableAuthors.find(a => a.name === selectedAuthor);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (authorDropdownRef.current && !authorDropdownRef.current.contains(e.target as Node)) {
        setAuthorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 py-4">
      <div className="max-w-[1320px] mx-auto px-4">
        {/* Character filter - horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          <button
            onClick={() => onCharacterChange('newest')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCharacter === 'newest'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {t('filter.newest')}
          </button>
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => onCharacterChange(char.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCharacter === char.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {getCharacterName(char, locale)}
            </button>
          ))}
        </div>

        {/* Year & Month filters */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {/* Year filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Month filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {MONTH_NAMES.filter((m) => availableMonths.includes(m.value)).map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Author filter - custom dropdown */}
          {availableAuthors.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Author:</label>
              <div ref={authorDropdownRef} className="relative">
                <button
                  onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 min-w-[160px]"
                >
                  {selectedAuthorData ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedAuthorData.avatar}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="truncate max-w-[120px]">{selectedAuthorData.name}</span>
                    </>
                  ) : (
                    <span>All</span>
                  )}
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </button>

                {authorDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => { onAuthorChange('all'); setAuthorDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedAuthor === 'all' ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    >
                      All Authors
                    </button>
                    {availableAuthors.map((author) => (
                      <button
                        key={author.name}
                        onClick={() => { onAuthorChange(author.name); setAuthorDropdownOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${selectedAuthor === author.name ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={author.avatar}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover bg-gray-200 dark:bg-gray-600 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/></svg>'; }}
                        />
                        <span className="truncate">{author.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clear filters button */}
          {(selectedYear !== 'all' || selectedMonth !== 'all' || selectedAuthor !== 'all') && (
            <button
              onClick={() => {
                onYearChange('all');
                onMonthChange('all');
                onAuthorChange('all');
              }}
              className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
