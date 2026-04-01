import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const fetchAll = url.searchParams.get('all') === 'true' && session.role === 'admin';

    // If fetchAll is true (admin managing pricing), pull everything.
    // If false (normal user creating order), pull only services that have prices > 0 correctly mapped.
    const sqlQuery = fetchAll 
      ? 'SELECT * FROM sales.pricing ORDER BY service_key' 
      : 'SELECT * FROM sales.pricing WHERE prices IS NOT NULL AND jsonb_array_length(prices) > 0 AND is_active = true ORDER BY name';

    const res = await query(sqlQuery);
    const pricingItems = res.rows;
    
    // Map them to the ShipService format frontend expects
    const services = pricingItems.map(p => ({
      id: p.service_key, 
      name: p.name,
      prices: p.prices,
      carrier: p.carrier,
      max_weight: p.max_weight,
      provider_prices: p.provider_prices,
      is_active: p.is_active,
      time: p.time,
      // ... mapping existing local DB schema to frontend expected 'ShipService' structure
      // Here we inject dummy service keys if needed or map directly.
      serviceKey: p.service_key,
    }));

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error('API /services Error:', error);
    return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
  }
}
