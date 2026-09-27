import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_VIDEO = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo'];
const ALLOWED_IMAGE = ['image/jpeg','image/png','image/gif','image/webp'];
const ALLOWED_TYPES = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE];
const MAX_VIDEO = 500 * 1024 * 1024;
const MAX_IMAGE =  10 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Storage not configured. Set BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.' },
        { status: 503 }
      );
    }

    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 }); }

    const file  = formData.get('file')  as File | null;
    const title = formData.get('title') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" not allowed.` }, { status: 400 });
    }

    const isVideo = ALLOWED_VIDEO.includes(file.type);
    const limit   = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File too large. Max ${(limit/(1024*1024)).toFixed(0)} MB.` },
        { status: 400 }
      );
    }

    const { put } = await import('@vercel/blob');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const pathname = `videolanka/${Date.now()}-${safeName}`;

    // ✅ Private blob (matches private store)
    const blob = await put(pathname, file, {
      access:          'private',
      contentType:     file.type,
      addRandomSuffix: true,
    });

    const serveUrl = `/api/serve?pathname=${encodeURIComponent(blob.pathname)}`;

    return NextResponse.json({
      url:         serveUrl,
      pathname:    blob.pathname,
      contentType: file.type,
      size:        file.size,
      title:       title ?? file.name,
    });

  } catch (error: unknown) {
    console.error('[UPLOAD POST]', error);
    const msg = error instanceof Error ? error.message : 'Upload failed. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
