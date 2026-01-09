'use client';

import { Character } from '@/types';

interface FilterBarProps {
  characters: Character[];
  selectedCharacter: string;
  selectedYear: string;
  selectedMonth: string;
  onCharacterChange: (characterId: string) => void;
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  availableYears: string[];
  availableMonths: string[];
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
  onCharacterChange,
  onYearChange,
  onMonthChange,
  availableYears,
  availableMonths,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-4">
      <div className="container mx-auto px-4">
        {/* Character filter - horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          <button
            onClick={() => onCharacterChange('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCharacter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {characters.map((char) => (
            <button
              key={char.id}
              onClick={() => onCharacterChange(char.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCharacter === char.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {char.name}
            </button>
          ))}
        </div>

        {/* Year & Month filters */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {/* Year filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="text-sm text-gray-600">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              {MONTH_NAMES.filter((m) => availableMonths.includes(m.value)).map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters button */}
          {(selectedYear !== 'all' || selectedMonth !== 'all') && (
            <button
              onClick={() => {
                onYearChange('all');
                onMonthChange('all');
              }}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              Clear date filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
