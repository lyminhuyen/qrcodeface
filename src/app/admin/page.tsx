'use client';

import { useState, useMemo } from 'react';
import { QRCode, Character, QRCodesData, CharactersData } from '@/types';
import qrcodesData from '@/data/qrcodes/index.json';
import charactersData from '@/data/characters.json';

export default function AdminPage() {
  const [qrcodes, setQrcodes] = useState<QRCode[]>(
    (qrcodesData as QRCodesData).qrcodes
  );
  const characters = (charactersData as CharactersData).characters;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCharacterId, setBulkCharacterId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'untagged' | 'all'>('untagged');

  // Filter untagged QR codes
  const filteredQrcodes = useMemo(() => {
    if (filter === 'untagged') {
      return qrcodes.filter((qr) => qr.characterId === 'untagged');
    }
    return qrcodes;
  }, [qrcodes, filter]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all visible
  const selectAll = () => {
    const newSet = new Set(filteredQrcodes.map((qr) => qr.id));
    setSelectedIds(newSet);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Update single item
  const updateSingle = async (qrcodeId: string, characterId: string) => {
    const character = characters.find((c) => c.id === characterId);
    if (!character) return;

    setSaving(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ qrcodeId, characterId, characterName: character.names.en }],
        }),
      });

      if (response.ok) {
        // Update local state
        setQrcodes((prev) =>
          prev.map((qr) =>
            qr.id === qrcodeId
              ? { ...qr, characterId, characterName: character.names.en }
              : qr
          )
        );
        setMessage(`Updated 1 item to ${character.names.en}`);
      } else {
        setMessage('Error updating');
      }
    } catch {
      setMessage('Error updating');
    }
    setSaving(false);
  };

  // Bulk update
  const bulkUpdate = async () => {
    if (selectedIds.size === 0 || !bulkCharacterId) return;

    const character = characters.find((c) => c.id === bulkCharacterId);
    if (!character) return;

    setSaving(true);
    try {
      const updates = Array.from(selectedIds).map((qrcodeId) => ({
        qrcodeId,
        characterId: bulkCharacterId,
        characterName: character.names.en,
      }));

      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        // Update local state
        setQrcodes((prev) =>
          prev.map((qr) =>
            selectedIds.has(qr.id)
              ? { ...qr, characterId: bulkCharacterId, characterName: character.names.en }
              : qr
          )
        );
        setMessage(`Updated ${selectedIds.size} items to ${character.names.en}`);
        setSelectedIds(new Set());
        setBulkCharacterId('');
      } else {
        setMessage('Error updating');
      }
    } catch {
      setMessage('Error updating');
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">
                Tag QRCode images to characters
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
            >
              Back to Gallery
            </a>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Show:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'untagged' | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="untagged">Untagged only ({qrcodes.filter(q => q.characterId === 'untagged').length})</option>
                <option value="all">All ({qrcodes.length})</option>
              </select>
            </div>

            {/* Selection actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                Clear
              </button>
              <span className="text-sm text-gray-600">
                {selectedIds.size} selected
              </span>
            </div>

            {/* Bulk tag */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkCharacterId}
                  onChange={(e) => setBulkCharacterId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select character...</option>
                  {characters
                    .filter((c) => c.id !== 'untagged')
                    .map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.names.en} ({char.names.zh})
                      </option>
                    ))}
                </select>
                <button
                  onClick={bulkUpdate}
                  disabled={!bulkCharacterId || saving}
                  className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg text-sm"
                >
                  {saving ? 'Saving...' : 'Apply'}
                </button>
              </div>
            )}

            {/* Message */}
            {message && (
              <span className="text-sm text-green-600">{message}</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredQrcodes.map((qrcode) => (
            <div
              key={qrcode.id}
              className={`relative bg-white rounded-lg overflow-hidden shadow ${
                selectedIds.has(qrcode.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(qrcode.id)}
                  onChange={() => toggleSelect(qrcode.id)}
                  className="w-5 h-5 rounded"
                />
              </div>

              {/* Image */}
              <div
                className="aspect-square cursor-pointer"
                onClick={() => toggleSelect(qrcode.id)}
              >
                {qrcode.images[0] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrcode.images[0]}
                    alt="QRCode"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>

              {/* Info & Tag selector */}
              <div className="p-2">
                <p className="text-xs text-gray-500 mb-2">{qrcode.createDate}</p>
                <select
                  value={qrcode.characterId}
                  onChange={(e) => updateSingle(qrcode.id, e.target.value)}
                  disabled={saving}
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    qrcode.characterId === 'untagged'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-300'
                  }`}
                >
                  <option value="untagged">-- Untagged --</option>
                  {characters
                    .filter((c) => c.id !== 'untagged')
                    .map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.names.en}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {filteredQrcodes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No untagged items!</p>
          </div>
        )}
      </div>
    </div>
  );
}
