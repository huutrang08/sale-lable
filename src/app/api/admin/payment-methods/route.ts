import { NextResponse } from 'next/server';
import { query } from '@/lib/db-server';
import { getSession } from '@/lib/session';

// GET — anyone logged in can read (for topup page display)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const res = await query(
      'SELECT id, name, address, qr_base64, is_active, created_at FROM sales.payment_methods ORDER BY id ASC',
      []
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST — admin only: create new
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const { name, address, qr_base64 } = await req.json();
  if (!name?.trim() || !address?.trim())
    return NextResponse.json({ success: false, message: 'Name and address cannot be empty' }, { status: 400 });

  try {
    const res = await query(
      'INSERT INTO sales.payment_methods (name, address, qr_base64) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), address.trim(), qr_base64 || null]
    );
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT — admin only: update existing
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const { id, name, address, qr_base64, is_active } = await req.json();
  if (!id) return NextResponse.json({ success: false, message: 'Missing ID' }, { status: 400 });

  try {
    await query(
      `UPDATE sales.payment_methods
       SET name = $1, address = $2, qr_base64 = $3, is_active = $4
       WHERE id = $5`,
      [name?.trim(), address?.trim(), qr_base64 ?? null, is_active ?? true, id]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE — admin only
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, message: 'Missing ID' }, { status: 400 });

  try {
    await query('DELETE FROM sales.payment_methods WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
