import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const pathname = searchParams.get('pathname');

    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
    }

    // Pass through Range header for video seeking support
    const rangeHeader = request.headers.get('range');
    const ifNoneMatch = request.headers.get('if-none-match');

    const result = await get(pathname, {
      access: 'private',
      ...(ifNoneMatch ? { ifNoneMatch } : {}),
    } as Parameters<typeof get>[1]);

    if (!result) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Handle 304 Not Modified
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: Object.fromEntries(result.headers.entries()),
      });
    }

    // 200 — stream the blob
    const headers: Record<string, string> = {
      'Content-Type':           result.blob.contentType,
      'Content-Length':         String(result.blob.size),
      'Cache-Control':          'public, max-age=3600',
      'Accept-Ranges':          'bytes',
      'X-Content-Type-Options': 'nosniff',
    };

    // Forward ETag if present
    const etag = result.headers.get('etag');
    if (etag) headers['ETag'] = etag;

    // If client sent a range, forward the Content-Range response header
    const contentRange = result.headers.get('content-range');
    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }

    return new NextResponse(result.stream, {
      status: rangeHeader ? 206 : 200,
      headers,
    });

  } catch (err) {
    console.error('[SERVE GET]', err);
    return new NextResponse('Failed to load file', { status: 500 });
  }
}
