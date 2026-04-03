import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isAdmin = session.role === 'admin';

    const res = isAdmin
      ? await query('SELECT * FROM orders ORDER BY created_at DESC', [])
      : await query('SELECT * FROM orders WHERE username = $1 ORDER BY created_at DESC', [session.username]);

    const orders = res.rows.map(o => ({
      ...o,
      created_at: new Date(o.created_at).toLocaleString('en-US'),
    }));

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('API /orders Error:', error);
    return NextResponse.json({ success: false, message: 'Error loading orders' }, { status: 500 });
  }
}
