import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/firebase-admin';

const ALLOWED_VIDEO = ['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo'];
const ALLOWED_IMAGE = ['image/jpeg','image/png','image/gif','image/webp'];
const ALLOWED_TYPES = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE];
const MAX_VIDEO = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE =  10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  // 🔐 Firebase auth check
  const user = await verifyAuthToken(request.headers.get('Authorization'));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 });
  }

  // ── Check Blob token ───────────────────────────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Storage not configured. Add BLOB_READ_WRITE_TOKEN to Vercel environment variables.' },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file  = formData.get('file')  as File | null;
  const title = formData.get('title') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File type "${file.type}" is not allowed. Only video and image files are accepted.` },
      { status: 400 }
    );
  }

  const isVideo = ALLOWED_VIDEO.includes(file.type);
  const limit   = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > limit) {
    const mb = (limit / (1024 * 1024)).toFixed(0);
    return NextResponse.json(
      { error: `File too large. Max ${mb} MB for ${isVideo ? 'video' : 'image'}.` },
      { status: 400 }
    );
  }

  try {
    // Dynamic import so missing token gives a clear error, not a crash
    const { put } = await import('@vercel/blob');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const pathname = `videolanka/${user.uid}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access:          'public',
      contentType:     file.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url:         blob.url,
      pathname:    blob.pathname,
      contentType: file.type,
      size:        file.size,
      title:       title ?? file.name,
    });
  } catch (error: unknown) {
    console.error('[UPLOAD POST]', error);
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
