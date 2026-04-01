import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, name, email, password, invite } = body;

    if (!username || !name || !password) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Check open_register setting
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'open_register'");
    const openRegister = settingsRes.rows[0]?.value === 'true';

    if (!openRegister) {
      const inviteRes = await query("SELECT value FROM settings WHERE key = 'invite_code'");
      const inviteCode = inviteRes.rows[0]?.value;
      if (!invite || invite !== inviteCode) {
        return NextResponse.json({ success: false, message: 'Mã mời không hợp lệ hoặc thiếu' }, { status: 403 });
      }
    }

    // Check existing user
    const exist = await query('SELECT username FROM users WHERE username = $1', [username]);
    if (exist.rows.length > 0) {
      return NextResponse.json({ success: false, message: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }

    const base64Pass = Buffer.from(password).toString('base64');
    
    // Insert new user
    const insertRes = await query(
      `INSERT INTO users (username, password, name, email, role, balance)
       VALUES ($1, $2, $3, $4, 'user', 0.00) RETURNING username, name, email, role, balance, api_key_id`,
      [username, base64Pass, name, email || null]
    );

    const newUser = insertRes.rows[0];

    // Log them in automatically
    await createSession(newUser);

    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
