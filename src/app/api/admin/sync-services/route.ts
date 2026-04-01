import { NextResponse } from 'next/server';
import pool from '@/lib/db-server';
import { getSession } from '@/lib/session';

export async function POST(req: Request) {
  const cronToken = req.headers.get('x-cron-auth');
  const isCronValid = cronToken === (process.env.CRON_SECRET || 'shiplabel-cron-secret-123');

  const session = await getSession();
  if (!isCronValid && (!session || session.role !== 'admin')) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  const dbClient = await pool.connect();
  
  try {
    const tokenRes = await dbClient.query("SELECT value FROM sales.settings WHERE key = 'master_api'");
    const apiKey = tokenRes.rows[0]?.value || '';

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Chưa cấu hình API Key đối tác (master_api)' }, { status: 400 });
    }

    const resp = await fetch('https://shiplabel.net/api/v2/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({})
    });

    if (!resp.ok) {
      return NextResponse.json({ success: false, message: `Lỗi kết nối đối tác: HTTP ${resp.status}` }, { status: 500 });
    }

    const json = await resp.json();
    
    // Đối tác trả về dạng { success: { labels: [...] } }
    const services = json?.success?.labels || json?.data || [];

    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ success: false, message: 'Phản hồi từ đối tác không đúng định dạng hoặc rỗng', detail: json }, { status: 500 });
    }

    await dbClient.query('BEGIN');
    let insertedCount = 0;
    
    for (const svc of services) {
      const { id, name, max_weight, price_ranges, type } = svc;
      
      if (!id || !name) continue;
      const carrier = type || (name.toLowerCase().includes('usps') ? 'usps' : 'ups');

      // Upsert: If service exists, update its name, max_weight and provider_prices.
      // We do NOT overwrite the `prices` (selling prices) array set by Admin.
      await dbClient.query(
        `INSERT INTO sales.pricing (service_key, name, max_weight, provider_prices, carrier, id, prices)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (service_key) 
         DO UPDATE SET name = EXCLUDED.name, max_weight = EXCLUDED.max_weight, provider_prices = EXCLUDED.provider_prices, id = EXCLUDED.id`,
         [id.toString(), name, max_weight || '', JSON.stringify(price_ranges || []), carrier, id.toString(), JSON.stringify([0,0,0,0,0])]
      );
      insertedCount++;
    }

    await dbClient.query('COMMIT');

    return NextResponse.json({ success: true, message: `Đồng bộ thành công ${insertedCount} dịch vụ.` });

  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    console.error('API /admin/sync-services POST Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    dbClient.release();
  }
}
