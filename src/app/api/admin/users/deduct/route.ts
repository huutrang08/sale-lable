import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import pool from '@/lib/db-server';
import { logException } from '@/lib/logger';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { username, amount, note } = await req.json();
    const parsedAmount = parseFloat(amount) || 0;

    if (!username || parsedAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      const uRes = await dbClient.query(
        'SELECT balance FROM sales.users WHERE username = $1 FOR UPDATE',
        [username]
      );
      if (uRes.rows.length === 0) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const currentBalance = parseFloat(uRes.rows[0].balance);
      if (currentBalance < parsedAmount) {
        await dbClient.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          message: `Insufficient balance. Current: $${currentBalance.toFixed(2)}`
        }, { status: 400 });
      }

      const newBalance = currentBalance - parsedAmount;

      await dbClient.query(
        'UPDATE sales.users SET balance = $1 WHERE username = $2',
        [newBalance, username]
      );

      // Log as negative amount in topup_history
      await dbClient.query(
        `INSERT INTO sales.topup_history (username, amount, after_balance, type, note, by_user)
         VALUES ($1, $2, $3, 'deduct', $4, $5)`,
        [username, -parsedAmount, newBalance, note || 'Manual deduction by admin', session.username]
      );

      await dbClient.query('COMMIT');
      return NextResponse.json({ success: true, balance: newBalance });
    } catch (txError) {
      await dbClient.query('ROLLBACK');
      throw txError;
    } finally {
      dbClient.release();
    }
  } catch (err: any) {
    console.error('API /admin/users/deduct POST Error:', err);
    await logException(req, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
