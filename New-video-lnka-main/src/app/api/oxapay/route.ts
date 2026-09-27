import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase';

const OXAPAY_MERCHANT_ID = process.env.OXAPAY_MERCHANT_ID ?? '';
const OXAPAY_API_KEY     = process.env.OXAPAY_API_KEY ?? '';
const OXAPAY_CALLBACK_SECRET = process.env.OXAPAY_CALLBACK_SECRET ?? ''; // Set this in Oxapay dashboard
const OXAPAY_BASE_URL    = 'https://api.oxapay.com';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Verify Oxapay's HMAC-SHA512 callback signature.
 * Oxapay signs all callback params (excluding 'sign') sorted alphabetically.
 * https://docs.oxapay.com/callbacks
 */
function verifyOxapaySignature(params: Record<string, string>, secret: string): boolean {
  const receivedSign = params['sign'] ?? params['hmac'];
  if (!receivedSign || !secret) return false;

  const message = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'hmac')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  const expected = createHmac('sha512', secret).update(message).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedSign, 'hex'));
  } catch {
    return false;
  }
}

// ─── POST: create payment invoice ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { amount, currency = 'LKR', email, uid } = body as {
      amount?: number;
      currency?: string;
      email?: string;
      uid?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }
    if (!uid) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (!OXAPAY_MERCHANT_ID || !OXAPAY_API_KEY) {
      // Demo mode — no real payment
      return NextResponse.json({
        paymentLink: `https://pay.oxapay.com/demo?amount=${amount}&currency=${currency}&order_id=${uid}_${Date.now()}`,
        status:  'demo',
        message: 'Oxapay not configured. Set OXAPAY_MERCHANT_ID and OXAPAY_API_KEY in .env.local.',
      });
    }

    const order_id = `VL_${uid}_${Date.now()}`;
    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://videolanka.com';

    const payload = {
      merchant:     OXAPAY_MERCHANT_ID,
      amount:       String(amount),
      currency,
      order_id,
      email:        email ?? '',
      callback_url: `${baseUrl}/api/oxapay`,
      success_url:  `${baseUrl}?payment=success`,
      fail_url:     `${baseUrl}?payment=fail`,
      description:  `VideoLanka Wallet Top-up — Rs.${amount}`,
    };

    const upstream = await fetch(`${OXAPAY_BASE_URL}/merchants/request`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${OXAPAY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('[Oxapay POST] upstream error:', text);
      return NextResponse.json({ error: 'Payment service unavailable.' }, { status: 502 });
    }

    const data = await upstream.json() as Record<string, unknown>;

    if (data['result'] !== 100 && data['result'] !== '100') {
      console.error('[Oxapay POST] invoice creation failed:', data);
      return NextResponse.json(
        { error: String(data['message'] ?? 'Failed to create payment.') },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paymentLink: data['paymentLink'] ?? data['pay_link'] ?? data['url'],
      trackId:     data['track_id']   ?? data['trackId'],
      orderId:     order_id,
      status:      'created',
    });
  } catch (error) {
    console.error('[Oxapay POST]', error);
    return NextResponse.json({ error: 'Payment processing failed.' }, { status: 500 });
  }
}

// ─── GET: Oxapay payment callback ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => { params[key] = value; });

    const status  = params['status'];
    const orderId = params['order_id'];
    const trackId = params['track_id'];

    if (!status || !orderId) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // 🔐 Verify Oxapay's HMAC signature (prevents fake callbacks)
    if (OXAPAY_CALLBACK_SECRET) {
      if (!verifyOxapaySignature(params, OXAPAY_CALLBACK_SECRET)) {
        console.warn('[Oxapay GET] Invalid signature — possible spoofed callback:', params);
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
      }
    } else {
      // Log a warning in production — OXAPAY_CALLBACK_SECRET should always be set
      console.warn('[Oxapay GET] OXAPAY_CALLBACK_SECRET not set — skipping signature verification!');
    }

    console.log('[Oxapay GET] callback received:', { status, orderId, trackId });

    // On successful payment, credit the user's wallet in Firestore.
    // orderId format: VL_<uid>_<timestamp>
    if (status === 'paid' || status === 'completed') {
      const parts = orderId.split('_');
      const uid   = parts[1]; // "VL_<uid>_<ts>" → parts[1]

      if (uid) {
        const amountStr = params['amount'];
        const amount    = amountStr ? parseFloat(amountStr) : 0;

        if (amount > 0) {
          try {
            await updateDoc(doc(firestoreDb, 'users', uid), {
              'kpis.balance': increment(amount),
            });
            console.log(`[Oxapay GET] Credited Rs.${amount} to user ${uid}`);
          } catch (firestoreErr) {
            console.error('[Oxapay GET] Firestore credit failed:', firestoreErr);
          }
        }
      }
    }

    return NextResponse.json({ received: true, status, orderId });
  } catch (error) {
    console.error('[Oxapay GET]', error);
    return NextResponse.json({ error: 'Callback processing failed.' }, { status: 500 });
  }
}
