import { NextRequest, NextResponse } from 'next/server';

// Oxapay API integration for crypto payment processing
// Docs: https://docs.oxapay.com/

const OXAPAY_MERCHANT_ID = process.env.OXAPAY_MERCHANT_ID || '';
const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY || '';
const OXAPAY_BASE_URL = 'https://api.oxapay.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'LKR', email, uid } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!OXAPAY_MERCHANT_ID || !OXAPAY_API_KEY) {
      // Demo mode: return a mock payment link when API keys aren't configured
      console.warn('Oxapay API keys not configured. Returning demo payment link.');
      return NextResponse.json({
        paymentLink: `https://pay.oxapay.com/demo?amount=${amount}&currency=${currency}&merchant=${OXAPAY_MERCHANT_ID || 'demo'}&order_id=${uid}_${Date.now()}`,
        status: 'demo',
        message: 'Oxapay API not configured. Set OXAPAY_MERCHANT_ID and OXAPAY_API_KEY in environment variables.',
      });
    }

    // Create Oxapay payment invoice
    const order_id = `VL_${uid}_${Date.now()}`;
    const payload = {
      merchant: OXAPAY_MERCHANT_ID,
      amount: amount.toString(),
      currency,
      order_id,
      email: email || '',
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://videolanka.com'}/api/oxapay`,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://videolanka.com'}?payment=success`,
      fail_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://videolanka.com'}?payment=fail`,
      description: `VideoLanka Wallet Top-up - Rs.${amount}`,
    };

    const response = await fetch(`${OXAPAY_BASE_URL}/merchants/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OXAPAY_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Oxapay API error:', errorText);
      return NextResponse.json(
        { error: 'Payment service unavailable. Please try again later.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.result !== 100 && data.result !== '100') {
      console.error('Oxapay payment creation failed:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to create payment' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paymentLink: data.paymentLink || data.pay_link || data.url,
      trackId: data.track_id || data.trackId,
      orderId: order_id,
      status: 'created',
    });
  } catch (error) {
    console.error('Oxapay route error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Callback handler for Oxapay payment notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const orderId = searchParams.get('order_id');
    const trackId = searchParams.get('track_id');

    if (!status || !orderId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // In production, verify the callback signature with Oxapay
    // and update the user's wallet balance in Firestore

    console.log('Oxapay callback:', { status, orderId, trackId });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Oxapay callback error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}
