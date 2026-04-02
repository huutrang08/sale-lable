import { NextResponse } from 'next/server';
import pool from '@/lib/db-server';
import { getSession } from '@/lib/session';

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await req.json(); // { usps_ground: { prices: [1,2,3], is_active: true } ... }

    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      const keys = Object.keys(payload);
      for (const key of keys) {
        const item = payload[key];
        if (item && Array.isArray(item.prices)) {
          const safePrices = item.prices.map((n: any) => parseFloat(n) || 0);
          const isActive = !!item.is_active;
          const time = item.time || '';

          await dbClient.query(
            'UPDATE sales.pricing SET prices = $1, is_active = $2, time = $4 WHERE service_key = $3 OR id = $3',
            [JSON.stringify(safePrices), isActive, key, time]
          );
        }
      }

      await dbClient.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Pricing list updated' });
    } catch (txError) {
      await dbClient.query('ROLLBACK');
      throw txError;
    } finally {
      dbClient.release();
    }
  } catch (err: any) {
    console.error('API /admin/pricing PUT Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
