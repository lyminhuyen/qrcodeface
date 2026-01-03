'use client';

import { Character } from '@/types';

interface FilterBarProps {
  characters: Character[];
  selectedCharacter: string;
  selectedMonth: string;
  onCharacterChange: (characterId: string) => void;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
}

export default function FilterBar({
  characters,
  selectedCharacter,
  selectedMonth,
  onCharacterChange,
  onMonthChange,
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

        {/* Month filter */}
        <div className="flex items-center gap-4 mt-3">
          <label className="text-sm text-gray-600">Filter by month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All time</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
