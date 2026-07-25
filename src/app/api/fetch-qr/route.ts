import { NextRequest, NextResponse } from 'next/server';

const CONVERTER_API = 'https://naraka-preset-converter-rust-worker.nmdz.workers.dev/';

/**
 * Resolve a CN Naraka share URL to its raw preset through the external worker.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const urlObj = new URL(url);
    const shareId = urlObj.searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json({ error: 'No shareId found in URL' }, { status: 400 });
    }

    const response = await fetch(CONVERTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareId, isPrivate: false }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Converter API failed: ${response.status}` },
        { status: response.status },
      );
    }

    const result = await response.json() as { preset?: string };
    if (!result.preset) {
      return NextResponse.json({ error: 'Converter API returned no preset' }, { status: 502 });
    }

    return NextResponse.json({ data: result.preset });
  } catch (error) {
    console.error('[API fetch-qr] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
