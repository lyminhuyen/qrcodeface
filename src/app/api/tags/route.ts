import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface UpdateItem {
  qrcodeId: string;
  characterId: string;
  characterName: string;
}

export async function POST(request: NextRequest) {
  try {
    const { updates } = (await request.json()) as { updates: UpdateItem[] };

    if (!updates || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Read current data
    const dataPath = path.join(process.cwd(), 'src/data/qrcodes/index.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Create update map for faster lookup
    const updateMap = new Map(
      updates.map((u) => [u.qrcodeId, { characterId: u.characterId, characterName: u.characterName }])
    );

    // Update qrcodes
    data.qrcodes = data.qrcodes.map((qr: { id: string; characterId: string; characterName: string }) => {
      const update = updateMap.get(qr.id);
      if (update) {
        return {
          ...qr,
          characterId: update.characterId,
          characterName: update.characterName,
        };
      }
      return qr;
    });

    // Update timestamp
    data.lastUpdated = new Date().toISOString();

    // Write back
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      updated: updates.length,
    });
  } catch (error) {
    console.error('Error updating tags:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
