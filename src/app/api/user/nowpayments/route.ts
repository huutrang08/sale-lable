import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';
import { logException } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json();
    const amount = parseFloat(payload.amount);
    
    if (isNaN(amount) || amount < 5) {
      return NextResponse.json({ success: false, message: 'Minimum top-up amount is 5 USD' }, { status: 400 });
    }

    const settingsRes = await query("SELECT key, value FROM sales.settings WHERE key IN ('nowpayments_api_key')");
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) settingsMap[row.key] = row.value;

    const apiKey = settingsMap['nowpayments_api_key'];
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'NOWPayments is not configured by Admin' }, { status: 500 });
    }

    // Prepare API call to NOWPayments
    const orderId = 'TOPUP_' + session.username + '_' + Date.now();
    
    // Note: IPN Callback URL needs to be your public domain
    // Let's rely on NOWPayments dashboard settings for IPN if it's not passed, 
    // or just pass a relative path which might not work. Better to not pass it and configure it in NOWPayments Dashboard.
    
    const body = {
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: orderId,
      order_description: `Topup for ${session.username}`
    };

    const npRes = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const npData = await npRes.json();

    // Log the API call
    await query(
      `INSERT INTO sales.api_logs (order_id, endpoint, request_body, response_body, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, 'https://api.nowpayments.io/v1/payment', JSON.stringify(body), JSON.stringify(npData), npRes.status]
    );

    if (!npRes.ok) {
        console.error('NOWPayments error:', npData);
        return NextResponse.json({ success: false, message: 'Failed to create payment via NOWPayments: ' + (npData.message || 'Unknown error') }, { status: 500 });
    }

    // npData contains payment_id, pay_address, pay_amount, status
    // Insert into sales.payments DB
    await query(
      `INSERT INTO sales.payments (payment_id, order_code, payment_method, amount, status, payment_resp, payment_req, payment_option)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        npData.payment_id,
        session.username, // Using order_code for username
        'NOWPAYMENTS',
        amount,
        'PENDING',
        JSON.stringify(npData),
        JSON.stringify(body),
        'usdttrc20'
      ]
    );

    return NextResponse.json({
        success: true,
        data: {
            payment_id: npData.payment_id,
            pay_address: npData.pay_address,
            pay_amount: npData.pay_amount,
            pay_currency: npData.pay_currency,
            amount_usd: amount
        }
    });

  } catch (err: any) {
    console.error('Create NowPayment Error:', err);
    await logException(request, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
