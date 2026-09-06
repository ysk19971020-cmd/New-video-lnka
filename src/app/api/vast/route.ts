import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET: Retrieve the global VAST URL (stored in local SQLite via Prisma)
export async function GET() {
  try {
    const setting = await db.setting.findUnique({
      where: { key: 'vastUrl' },
    });

    return NextResponse.json({ vastUrl: setting?.value || '' });
  } catch (error) {
    console.error('VAST URL fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VAST URL', vastUrl: '' },
      { status: 500 }
    );
  }
}

// POST: Save/update the global VAST URL (admin only)
export async function POST(request: NextRequest) {
  try {
    const { vastUrl, email } = await request.json();

    if (!vastUrl) {
      return NextResponse.json({ error: 'VAST URL is required' }, { status: 400 });
    }

    // Upsert the VAST URL setting in local database
    await db.setting.upsert({
      where: { key: 'vastUrl' },
      update: { value: vastUrl },
      create: { key: 'vastUrl', value: vastUrl },
    });

    return NextResponse.json({
      success: true,
      vastUrl,
      updatedBy: email || 'admin',
    });
  } catch (error) {
    console.error('VAST URL save error:', error);
    return NextResponse.json(
      { error: 'Failed to save VAST URL' },
      { status: 500 }
    );
  }
}

// PUT: Proxy VAST URL to avoid CORS issues
export async function PUT(request: NextRequest) {
  try {
    const { vastUrl } = await request.json();

    if (!vastUrl) {
      return NextResponse.json({ error: 'VAST URL is required' }, { status: 400 });
    }

    // Fetch VAST XML from the provided URL (server-side to avoid CORS)
    const response = await fetch(vastUrl, {
      headers: {
        'Accept': 'application/xml, text/xml',
        'User-Agent': 'VideoLanka/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `VAST fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const xml = await response.text();

    return new NextResponse(xml, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/xml',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('VAST proxy error:', error);
    return NextResponse.json(
      { error: 'VAST proxy request failed' },
      { status: 500 }
    );
  }
}
