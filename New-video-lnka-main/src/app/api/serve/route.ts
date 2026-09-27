import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.searchParams.get('pathname');
  if (!pathname) return new NextResponse('Missing pathname', { status: 400 });

  try {
    const result = await get(pathname, { access: 'private' });
    if (!result) return new NextResponse('Not found', { status: 404 });
    if (result.statusCode === 304) return new NextResponse(null, { status: 304 });

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        'Content-Type':  result.blob.contentType,
        'Content-Length': String(result.blob.size),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (e) {
    console.error('[SERVE]', e);
    return new NextResponse('Error', { status: 500 });
  }
}
