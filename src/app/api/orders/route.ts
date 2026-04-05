import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';
import { logException } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isAdmin = session.role === 'admin';
    const body = await request.json().catch(() => ({}));
    
    const page = Math.max(1, parseInt(body.page) || 1);
    const pageSize = Math.max(1, parseInt(body.pageSize) || 20);
    const search = (body.search || '').trim();
    
    const offset = (page - 1) * pageSize;
    
    let baseQuery = isAdmin ? 'FROM orders' : 'FROM orders WHERE username = $1';
    const countParams: any[] = isAdmin ? [] : [session.username];
    const dataParams: any[] = isAdmin ? [] : [session.username];
    
    if (search) {
      const searchParam = `%${search}%`;
      if (isAdmin) {
        baseQuery += ' WHERE (tracking_id ILIKE $1 OR to_name ILIKE $1 OR from_name ILIKE $1 OR username ILIKE $1)';
        countParams.push(searchParam);
        dataParams.push(searchParam);
      } else {
        baseQuery += ' AND (tracking_id ILIKE $2 OR to_name ILIKE $2 OR from_name ILIKE $2)';
        countParams.push(searchParam);
        dataParams.push(searchParam);
      }
    }
    
    const countRes = await query(`SELECT COUNT(*) as total ${baseQuery}`, countParams);
    const total = parseInt(countRes.rows[0].total) || 0;
    
    const dataQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(pageSize, offset);
    
    const res = await query(dataQuery, dataParams);

    const orders = res.rows.map(o => ({
      ...o,
      created_at: new Date(o.created_at).toLocaleString('en-US'),
    }));

    return NextResponse.json({ success: true, data: orders, total });
  } catch (error) {
    console.error('API /orders Error:', error);
    await logException(request, error);
    return NextResponse.json({ success: false, message: 'Error loading orders' }, { status: 500 });
  }
}
