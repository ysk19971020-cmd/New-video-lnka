import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminToken } from '@/lib/firebase-admin';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * SSRF protection: only allow real public HTTP(S) URLs.
 * Blocks localhost, private RFC-1918 ranges, IPv6 loopback, and
 * non-http(s) schemes (file://, gopher://, …).
 */
function isAllowedVastUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return false;

  const h = url.hostname.toLowerCase();

  // Localhost
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')) return false;

  // Private IPv4 (RFC 1918 + link-local)
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
  ];
  if (privatePatterns.some((r) => r.test(h))) return false;

  // Cloud-provider metadata endpoints (AWS, GCP, Azure)
  if (h === '169.254.169.254' || h === 'metadata.google.internal') return false;

  return true;
}

// ─── GET: fetch current VAST URL (public) ────────────────────────────────────

export async function GET() {
  try {
    const setting = await db.setting.findUnique({ where: { key: 'vastUrl' } });
    return NextResponse.json({ vastUrl: setting?.value ?? '' });
  } catch (error) {
    console.error('[VAST GET]', error);
    return NextResponse.json({ error: 'Failed to fetch VAST URL', vastUrl: '' }, { status: 500 });
  }
}

// ─── POST: update VAST URL (admin only) ──────────────────────────────────────

export async function POST(request: NextRequest) {
  // 🔐 Verify Firebase ID token and confirm admin email
  const admin = await verifyAdminToken(request.headers.get('Authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: admins only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const vastUrl: unknown = body.vastUrl;

    if (typeof vastUrl !== 'string' || !vastUrl.trim()) {
      return NextResponse.json({ error: 'vastUrl is required' }, { status: 400 });
    }

    if (!isAllowedVastUrl(vastUrl)) {
      return NextResponse.json(
        { error: 'Invalid VAST URL. Must be a public http/https address.' },
        { status: 400 }
      );
    }

    await db.setting.upsert({
      where:  { key: 'vastUrl' },
      update: { value: vastUrl },
      create: { key: 'vastUrl', value: vastUrl },
    });

    return NextResponse.json({ success: true, vastUrl, updatedBy: admin.email });
  } catch (error) {
    console.error('[VAST POST]', error);
    return NextResponse.json({ error: 'Failed to save VAST URL' }, { status: 500 });
  }
}

// ─── PUT: proxy VAST XML (admin only, SSRF-protected) ────────────────────────

export async function PUT(request: NextRequest) {
  // 🔐 Only admins may trigger server-side fetches (prevents SSRF abuse by users)
  const admin = await verifyAdminToken(request.headers.get('Authorization'));
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden: admins only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const vastUrl: unknown = body.vastUrl;

    if (typeof vastUrl !== 'string' || !vastUrl.trim()) {
      return NextResponse.json({ error: 'vastUrl is required' }, { status: 400 });
    }

    // 🔐 SSRF guard — must be a real public URL
    if (!isAllowedVastUrl(vastUrl)) {
      return NextResponse.json(
        { error: 'Invalid VAST URL. Must be a public http/https address.' },
        { status: 400 }
      );
    }

    const upstream = await fetch(vastUrl, {
      headers: { Accept: 'application/xml, text/xml', 'User-Agent': 'VideoLanka/1.0' },
      // Abort after 10 s so the route doesn't hang
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `VAST fetch failed: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const xml = await upstream.text();
    return new NextResponse(xml, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/xml',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('[VAST PUT proxy]', error);
    return NextResponse.json({ error: 'VAST proxy request failed' }, { status: 500 });
  }
}
