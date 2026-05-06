import { NextResponse } from 'next/server';
import pool, { query } from '@/lib/db-server';
import https from 'https';
import { getSession } from '@/lib/session';
import { logException } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const payload = await request.json();
  const { label_id, weight, fromName, toName, length, width, height,
    fromAddress, fromAddress2, fromCity, fromState, fromZip, fromCountry, fromCompany,
    toAddress, toAddress2, toCity, toState, toZip, toCountry, toCompany,
    reference_1, reference_2, discription
  } = payload;

  let w = parseFloat(weight) || 0;
  if (w <= 0) return NextResponse.json({ success: false, message: 'Invalid weight' }, { status: 400 });
  let l = parseFloat(length) || 0;
  let wd = parseFloat(width) || 0;
  let h = parseFloat(height) || 0;

  // Prevent numeric overflow in DB (NUMERIC(10,2) allows up to 8 digits before decimal)
  w = Math.min(w, 99999999);
  l = Math.min(l, 99999999);
  wd = Math.min(wd, 99999999);
  h = Math.min(h, 99999999);

  // Price computation logic matching frontend
  const pRes = await query('SELECT name, prices FROM pricing WHERE id = $1', [label_id]);
  const pricing = pRes.rows[0];
  if (!pricing) return NextResponse.json({ success: false, message: 'Service not found' }, { status: 400 });

  const prices = pricing.prices as number[];
  if (!prices || prices.length === 0) return NextResponse.json({ success: false, message: 'Pricing config error' }, { status: 500 });

  let finalPrice = prices[prices.length - 1]; // default max
  const weightRanges = [5, 10, 25, 40, 70];
  for (let i = 0; i < weightRanges.length; i++) {
    if (w <= weightRanges[i]) {
      finalPrice = prices[Math.min(i, prices.length - 1)];
      break;
    }
  }

  let originalPrice = finalPrice;
  let discountAmount = 0;

  const dbClient = await pool.connect();
  const orderId = 'ORD' + Date.now();

  try {
    // -------------------------------------------------------------
    // PHASE 1: DEDUCT BALANCE AND CREATE "PROCESSING" ORDER
    // -------------------------------------------------------------
    await dbClient.query('BEGIN');

    const uRes = await dbClient.query('SELECT balance FROM sales.users WHERE username = $1 FOR UPDATE', [session.username]);
    if (uRes.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const currentBalance = parseFloat(uRes.rows[0].balance);
    if (currentBalance < finalPrice) {
      await dbClient.query('ROLLBACK');
      return NextResponse.json({ success: false, message: `Insufficient balance. Required: $${finalPrice.toFixed(2)}` }, { status: 400 });
    }

    const newBalance = currentBalance - finalPrice;
    await dbClient.query('UPDATE sales.users SET balance = $1 WHERE username = $2', [newBalance, session.username]);

    // Insert order as PROCESSING
    await dbClient.query(
      `INSERT INTO sales.orders (
        id, username, tracking_id, pdf, price, discount, service, service_key, weight, length, width, height,
        from_name, from_address, from_city, from_state, from_zip,
        to_name, to_address, to_city, to_state, to_zip, api_key_label, raw_response, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW())`,
      [
        orderId, session.username, 'PROCESSING', '', originalPrice, discountAmount, pricing.name, label_id, w, l, wd, h,
        fromName, fromAddress, fromCity, fromState, fromZip,
        toName, toAddress, toCity, toState, toZip, 'Default API', JSON.stringify({ status: 'calling external api' })
      ]
    );

    // Save deduction history
    await dbClient.query(
      `INSERT INTO sales.topup_history (username, amount, after_balance, type, ref_id, note, by_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session.username, -finalPrice, newBalance, 'order', orderId, `Charge for label ${pricing.name}`, 'system']
    );

    await dbClient.query('COMMIT');

    // -------------------------------------------------------------
    // PHASE 2: CALL 3RD PARTY API
    // -------------------------------------------------------------
    const tokenRes = await dbClient.query("SELECT value FROM sales.settings WHERE key = 'master_api'");
    const apiKey = tokenRes.rows[0]?.value || '';

    const apiBody = {
      label_id,
      fromName, fromCompany: fromCompany || '', fromAddress, fromAddress2: fromAddress2 || '', fromZip, fromState, fromCity, fromCountry: fromCountry || 'US',
      toName, toCompany: toCompany || '', toAddress, toAddress2: toAddress2 || '', toZip, toState, toCity, toCountry: toCountry || 'US',
      weight: w, length: l, width: wd, height: h,
      reference_1: reference_1 || '', reference_2: reference_2 || '', discription: discription || ''
    };

    let statusCode = 500;
    let apiSuccess = false;
    let apiJson: any = { message: 'Timeout/Network error' };

    try {
      const fetchPromise = new Promise<{ status: number, data: string }>((resolve, reject) => {
        const bodyStr = JSON.stringify(apiBody);
        const req = https.request('https://shiplabel.net/api/v2/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(bodyStr)
          },
          timeout: 60000 // 60s connect & inactivity timeout
        }, (res) => {
          let chunks = '';
          res.on('data', chunk => chunks += chunk);
          res.on('end', () => resolve({ status: res.statusCode || 500, data: chunks }));
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy(new Error('Request timed out after 60s'));
        });

        req.write(bodyStr);
        req.end();
      });

      const result = await fetchPromise;
      statusCode = result.status;
      const responseText = result.data;
      try { apiJson = JSON.parse(responseText); } catch { apiJson = { raw: responseText }; }

      // 3rd party may return {success: true, data: {...}} OR {success: {data: {...}}}
      if (statusCode === 200) {
        if (apiJson.success === true && apiJson.data) {
          apiSuccess = true;
        } else if (apiJson.success && typeof apiJson.success === 'object' && (apiJson.success as any).data) {
          // Normalize: lift data up
          apiJson = { success: true, data: (apiJson.success as any).data };
          apiSuccess = true;
        }
      }
    } catch (e: any) {
      const isAbort = e.name === 'AbortError';
      const cause = e.cause ? String(e.cause) : undefined;
      console.error('[3rd-party fetch error]', {
        message: e.message,
        cause,
        isTimeout: isAbort,
      });
      apiJson = {
        error: isAbort ? 'Request timed out after 60s' : e.message,
        ...(cause ? { cause } : {}),
      };
    }

    // Insert API Log
    await dbClient.query(
      `INSERT INTO sales.api_logs (order_id, endpoint, request_body, response_body, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, 'https://shiplabel.net/api/v2/create-order', JSON.stringify(apiBody), JSON.stringify(apiJson), statusCode]
    );

    // -------------------------------------------------------------
    // PHASE 3: HANDLE API RESULT (COMMIT OR REFUND)
    // -------------------------------------------------------------
    if (apiSuccess && (apiJson.data?.pdf || apiJson.data?.tracking_id)) {
      // SUCCESS!
      const tracking = apiJson.data.tracking_id || 'UNKNOWN';
      const pdf = apiJson.data.pdf;

      try {
        await dbClient.query(
          `UPDATE sales.orders SET tracking_id = $1, pdf = $2, raw_response = $3 WHERE id = $4`,
          [tracking, pdf, JSON.stringify(apiJson), orderId]
        );
        await dbClient.query(
          `UPDATE sales.topup_history SET note = $1 WHERE ref_id = $2 AND type = 'order'`,
          [`Payment for shipment ${tracking}`, orderId]
        );
      } catch (dbErr: any) {
        console.error('[DB update after success]', dbErr);
        // Không refund — API đã tạo label thành công, chỉ log lỗi DB
      }

      return NextResponse.json({
        success: true,
        tracking_id: tracking,
        pdf_url: pdf,
        price: finalPrice
      });
    } else {
      // FAILED! Need to refund
      await dbClient.query('BEGIN');
      const refundU = await dbClient.query('SELECT balance FROM sales.users WHERE username = $1 FOR UPDATE', [session.username]);
      if (refundU.rows.length > 0) {
        const refundBal = parseFloat(refundU.rows[0].balance) + finalPrice;

        await dbClient.query('UPDATE sales.users SET balance = $1 WHERE username = $2', [refundBal, session.username]);

        await dbClient.query(
          `INSERT INTO sales.topup_history (username, amount, after_balance, type, ref_id, note, by_user)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [session.username, finalPrice, refundBal, 'refund', orderId, `Refund: label creation API failed`, 'system']
        );
      }
      // Set order to FAILED
      await dbClient.query(
        `UPDATE sales.orders SET tracking_id = 'FAILED', pdf = '', raw_response = $1 WHERE id = $2`,
        [JSON.stringify(apiJson), orderId]
      );
      await dbClient.query('COMMIT');

      return NextResponse.json({
        success: false,
        message: apiJson.message || apiJson.error || 'Carrier API error. Your balance has been refunded.'
      }, { status: 400 });
    }

  } catch (err: any) {
    console.error('API Orders Create Error:', err);
    await logException(request, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    dbClient.release();
  }
}
