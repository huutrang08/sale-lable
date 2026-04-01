import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    // In a real app we would use bcrypt, but we are keeping compatibility with btoa
    const base64Pass = Buffer.from(password).toString('base64');

    const res = await query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, base64Pass]);
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });
    }

    // Exclude password from token payload
    const { password: _, ...userPayload } = user;
    userPayload.balance = parseFloat(userPayload.balance) || 0;
    
    await createSession(userPayload);

    return NextResponse.json({ success: true, data: userPayload });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống' }, { status: 500 });
  }
}
