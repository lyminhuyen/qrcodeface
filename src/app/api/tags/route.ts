import { NextRequest, NextResponse } from 'next/server';
import { isLocalToolRuntime } from '@/lib/local-runtime.server';
import { updateQRCodeCharacters, type CharacterUpdate } from '@/lib/qrcodes/data.server';

const MAX_UPDATES_PER_REQUEST = 500;

export async function POST(request: NextRequest) {
  if (!isLocalToolRuntime()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { updates } = (await request.json()) as { updates?: CharacterUpdate[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    if (updates.length > MAX_UPDATES_PER_REQUEST) {
      return NextResponse.json({ error: 'Too many updates' }, { status: 400 });
    }

    const validUpdates = updates.every(
      (update) =>
        update &&
        typeof update.qrcodeId === 'string' &&
        typeof update.characterId === 'string'
    );
    if (!validUpdates) {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 });
    }

    const updated = await updateQRCodeCharacters(updates);

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    console.error('Error updating tags:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
