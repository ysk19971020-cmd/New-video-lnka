import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

// Public proxy for private blobs — anyone on the site can watch videos
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname) {
    return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
  }

  try {
    const result = await get(pathname, { access: 'private' });
    if (!result) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type':           result.blob.contentType ?? 'application/octet-stream',
        'Cache-Control':          'public, max-age=2592000',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges':          'bytes',
      },
    });
  } catch (err) {
    console.error('[SERVE GET]', err);
    return new NextResponse('Failed to load file', { status: 500 });
  }
}
