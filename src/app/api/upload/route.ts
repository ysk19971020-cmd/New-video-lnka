import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
      return NextResponse.json({ error: 'Invalid file type. Only video and image files are allowed.' }, { status: 400 });
    }

    // Validate file size (max 500MB for video, 10MB for image)
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `File too large. Max ${isVideo ? '500MB' : '10MB'} for ${isVideo ? 'video' : 'image'} files.`
      }, { status: 400 });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `videolanka/${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
      title: title || file.name,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
