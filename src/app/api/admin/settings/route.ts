import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';
import { logException } from '@/lib/logger';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const res = await query('SELECT key, value FROM sales.settings');
    const settingsMap: Record<string, string> = {};
    for (const row of res.rows) {
      settingsMap[row.key] = row.value;
    }
    return NextResponse.json({ success: true, data: settingsMap });
  } catch (err: any) {
    await logException(request, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    
    // UPSERT all keys in payload
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        await query(
          'INSERT INTO sales.settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
          [key, value]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Settings Update Error:', err);
    await logException(request, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
