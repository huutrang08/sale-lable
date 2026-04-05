import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { query } from '@/lib/db-server';
import { logException } from '@/lib/logger';

export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await query('SELECT username, name, email, role, balance, api_key_id FROM users WHERE username = $1', [session.username]);
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    user.balance = parseFloat(user.balance) || 0;

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    await logException(request, error);
    return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
  }
}
