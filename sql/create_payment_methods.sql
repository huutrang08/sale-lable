-- ============================================================
-- Tạo bảng lưu thông tin thanh toán (payment_methods)
-- Chạy script này trong PostgreSQL schema: sales
-- ============================================================

CREATE TABLE IF NOT EXISTS sales.payment_methods (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,          -- Tên phương thức, VD: "Momo", "USDT TRC20"
  address     TEXT        NOT NULL,          -- Địa chỉ / Số tài khoản / Ví
  qr_base64   TEXT,                          -- Ảnh QR dạng base64 (data:image/png;base64,...)
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION sales.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON sales.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON sales.payment_methods
  FOR EACH ROW EXECUTE FUNCTION sales.set_updated_at();

-- Comment mô tả bảng
COMMENT ON TABLE sales.payment_methods IS 'Lưu các phương thức thanh toán hiển thị cho người dùng khi nạp tiền';
COMMENT ON COLUMN sales.payment_methods.name       IS 'Tên hiển thị: Momo, USDT, Ngân hàng...';
COMMENT ON COLUMN sales.payment_methods.address    IS 'Số tài khoản / địa chỉ ví / số điện thoại';
COMMENT ON COLUMN sales.payment_methods.qr_base64  IS 'Ảnh QR dạng data URI base64';
COMMENT ON COLUMN sales.payment_methods.is_active  IS 'true = đang hiển thị cho người dùng';
