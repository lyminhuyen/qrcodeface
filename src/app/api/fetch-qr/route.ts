import { NextRequest, NextResponse } from 'next/server';

const CONVERTER_API = 'https://naraka-preset-converter-rust-worker.nmdz.workers.dev/';

/**
 * Fetch QR data from 163.com via converter worker
 *
 * CN QR contains: https://q.ds.163.com/yjwujian/?module=nielian&shareId=xxx
 * We extract shareId and call the converter API
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    console.log('[API fetch-qr] Fetching:', url);

    // Extract shareId from URL
    const urlObj = new URL(url);
    const shareId = urlObj.searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ error: 'No shareId found in URL' }, { status: 400 });
    }

    console.log('[API fetch-qr] ShareId:', shareId);

    // Call the converter worker API
    const response = await fetch(CONVERTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shareId,
        isPrivate: false,
      }),
    });

    if (!response.ok) {
      console.log('[API fetch-qr] Worker API failed:', response.status);
      return NextResponse.json(
        { error: `Converter API failed: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[API fetch-qr] Got preset for hero:', result.hero_id);

    // Return the preset data
    return NextResponse.json({ data: result.preset });
  } catch (error) {
    console.error('[API fetch-qr] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
