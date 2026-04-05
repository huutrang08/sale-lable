import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db-server';
import { logException } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const headersList = request.headers;
    const signature = headersList.get('x-nowpayments-sig') || '';

    const paymentId = payload.payment_id;
    const reportedStatus = payload.payment_status;

    // 1. Log incoming payload
    await query(
      `INSERT INTO sales.nowpayments_ipn_logs (payment_id, payment_status, raw_payload, signature)
       VALUES ($1, $2, $3, $4)`,
      [paymentId, reportedStatus, JSON.stringify(payload), signature]
    );

    if (!paymentId) {
      return NextResponse.json({ success: false, message: 'Missing payment_id' }, { status: 400 });
    }

    // 2. We skip signature verification via IPN Secret, and instead query NOWPayments 
    //    directly to get the real status, ensuring it's not spoofed.
    const settingsRes = await query("SELECT key, value FROM sales.settings WHERE key = 'nowpayments_api_key'");
    if (settingsRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'API key not configured' }, { status: 500 });
    }
    const apiKey = settingsRes.rows[0].value;

    const npRes = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    const npData = await npRes.json();

    // Log the verify API call
    await query(
      `INSERT INTO sales.api_logs (order_id, endpoint, request_body, response_body, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [String(paymentId), `https://api.nowpayments.io/v1/payment/${paymentId}`, JSON.stringify({}), JSON.stringify(npData), npRes.status]
    );

    if (!npRes.ok) {
      return NextResponse.json({ success: false, message: 'Failed to verify payment with NOWPayments' }, { status: 500 });
    }
    const actualStatus = npData.payment_status;

    // 3. Prevent duplicate processing
    const paymentRes = await query("SELECT * FROM sales.payments WHERE payment_id = $1", [String(paymentId)]);
    if (paymentRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Payment not found in system' }, { status: 404 });
    }

    const dbPayment = paymentRes.rows[0];
    if (dbPayment.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // 4. Update the stored status
    if (actualStatus !== dbPayment.status) {
      let mappedStatus = actualStatus.toLowerCase(); // waiting, failed, etc.
      if (actualStatus === 'finished') mappedStatus = 'COMPLETED';
      console.log("Mapped Status: ", mappedStatus)
      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');

        // Update payment record
        await dbClient.query(
          "UPDATE sales.payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $2",
          [mappedStatus, String(paymentId)]
        );


        // If actualStatus is finished, we top up the user
        if (actualStatus === 'finished' && dbPayment.status !== 'COMPLETED') {
          const username = dbPayment.order_code; // We stored username here
          const amount = parseFloat(dbPayment.amount);

          const uRes = await dbClient.query('SELECT balance FROM sales.users WHERE username = $1 FOR UPDATE', [username]);
          if (uRes.rows.length > 0) {
            const newBal = parseFloat(uRes.rows[0].balance) + amount;
            await dbClient.query('UPDATE sales.users SET balance = $1 WHERE username = $2', [newBal, username]);

            // Insert topup history
            await dbClient.query(
              `INSERT INTO sales.topup_history (username, amount, after_balance, type, ref_id, note, by_user)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [username, amount, newBal, 'topup', String(paymentId), `Auto Topup via NOWPayments (Crypto)`, 'system']
            );
          }
        }
        await dbClient.query('COMMIT');
      } catch (txnError) {
        await dbClient.query('ROLLBACK');
        throw txnError;
      } finally {
        dbClient.release();
      }
    }

    return NextResponse.json({ success: true, status: actualStatus });
  } catch (err: any) {
    console.error('NOWPayments Webhook Error:', err);
    await logException(request, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
