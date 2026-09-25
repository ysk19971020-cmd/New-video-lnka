import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyAuthToken } from '@/lib/firebase-admin';

// Allowed MIME prefixes
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_TYPES = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE];

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_BYTES =  10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  // 🔐 Must be a signed-in Firebase user
  const user = await verifyAuthToken(request.headers.get('Authorization'));
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — please sign in.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file  = formData.get('file')  as File | null;
    const title = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed. Only video and image files are accepted.` },
        { status: 400 }
      );
    }

    // Validate file size
    const isVideo = ALLOWED_VIDEO.includes(file.type);
    const limit   = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      const mb = (limit / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        { error: `File too large. Maximum size for ${isVideo ? 'video' : 'image'} is ${mb} MB.` },
        { status: 400 }
      );
    }

    // Sanitise filename; prefix with uploading user's uid to scope storage
    const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const pathname  = `videolanka/${user.uid}/${Date.now()}-${safeName}`;

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
  } catch (error) {
    console.error('[UPLOAD POST]', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
