import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return null;
  }
  return session;
}

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  try {
    const userRes = await query('SELECT username, name, email, role, balance, api_key_id FROM users');
    const users = userRes.rows;

    const orderRes = await query('SELECT username, COUNT(*) as c FROM orders GROUP BY username');
    const orderMap: Record<string, number> = {};
    orderRes.rows.forEach(r => { orderMap[r.username] = parseInt(r.c, 10); });

    const topupRes = await query(`
      SELECT * FROM (
        SELECT id, username, amount, after_balance as after, note, by_user as by,
               created_at as date,
               ROW_NUMBER() OVER(PARTITION BY username ORDER BY created_at DESC) as rn
        FROM topup_history
      ) T WHERE rn <= 10
    `);
    
    // Group topups
    const topupMap: Record<string, any[]> = {};
    topupRes.rows.forEach(r => {
      if (!topupMap[r.username]) topupMap[r.username] = [];
      topupMap[r.username].push({
        ...r,
        amount: parseFloat(r.amount),
        after: parseFloat(r.after),
        date: new Date(r.date).toLocaleString('vi-VN')
      });
    });

    const fullUsers = users.map(u => ({
      ...u,
      balance: parseFloat(u.balance),
      orders: new Array(orderMap[u.username] || 0), // we just need length on frontend, but array format for compatibility
      topup_history: topupMap[u.username] || []
    }));

    return NextResponse.json({ success: true, data: fullUsers });
  } catch (err: any) {
    console.error('API /admin/users GET Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  try {
    const { username, name, email, pass, role, balance, apiKeyId } = await req.json();
    if (!username || !name || !pass) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });

    const exist = await query('SELECT username FROM users WHERE username = $1', [username]);
    if (exist.rows.length > 0) return NextResponse.json({ success: false, message: 'Username existed' }, { status: 400 });

    const base64Pass = Buffer.from(pass).toString('base64');
    
    await query(
      `INSERT INTO users (username, password, name, email, role, balance, api_key_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username, base64Pass, name, email || null, role || 'user', parseFloat(balance) || 0, apiKeyId || null]
    );

    return NextResponse.json({ success: true, message: 'Created successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  try {
    const { username, name, email, pass, role, balance, apiKeyId } = await req.json();
    if (!username || !name) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });

    let sqlStr = 'UPDATE users SET name = $2, email = $3, role = $4, balance = $5, api_key_id = $6 WHERE username = $1';
    let params: any[] = [username, name, email || null, role || 'user', parseFloat(balance) || 0, apiKeyId || null];

    if (pass) {
      sqlStr = 'UPDATE users SET name = $2, email = $3, role = $4, balance = $5, api_key_id = $6, password = $7 WHERE username = $1';
      params.push(Buffer.from(pass).toString('base64'));
    }

    await query(sqlStr, params);

    return NextResponse.json({ success: true, message: 'Updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    if (!username) return NextResponse.json({ success: false, message: 'Missing username' }, { status: 400 });

    await query('DELETE FROM users WHERE username = $1', [username]);

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
