-- ==============================================================================
-- DATABASE: ship_partner
-- SCHEMA: sales
-- ==============================================================================

-- 1. Khởi tạo Schema
CREATE SCHEMA IF NOT EXISTS sales;
SET search_path TO sales;

-- 2. Xóa các bảng cũ (Nếu bạn muốn chạy lại script từ đầu)
DROP TABLE IF EXISTS topup_history CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS pricing CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ==============================================================================
-- 3. TẠO BẢNG (CREATE TABLES)
-- ==============================================================================

-- Bảng người dùng
CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    balance NUMERIC(10, 2) DEFAULT 0.00,
    api_key_id VARCHAR(50), -- FK constraint sẽ thêm vào sau khi tạo bảng api_keys
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu trữ API Keys
CREATE TABLE api_keys (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
    label VARCHAR(100),
    key_value VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ràng buộc khóa ngoại vòng cho users
ALTER TABLE users 
ADD CONSTRAINT fk_user_apikey 
FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL;

-- Bảng Lịch sử giao dịch (Nạp/Trừ tiền)
CREATE TABLE topup_history (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    after_balance NUMERIC(10, 2) NOT NULL,
    type VARCHAR(50) DEFAULT 'topup', -- 'topup' hoặc 'order'
    ref_id VARCHAR(50), -- Liên kết tới ID đơn hàng nếu có
    note TEXT,
    by_user VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Đơn đặt nhãn (Đơn hàng)
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
    tracking_id VARCHAR(100),
    pdf TEXT,
    price NUMERIC(10, 2),
    service VARCHAR(100),
    service_key VARCHAR(50),
    weight NUMERIC(10, 2),
    length NUMERIC(10, 2),
    width NUMERIC(10, 2),
    height NUMERIC(10, 2),
    from_name VARCHAR(100),
    from_address VARCHAR(255),
    from_city VARCHAR(100),
    from_state VARCHAR(20),
    from_zip VARCHAR(20),
    to_name VARCHAR(100),
    to_address VARCHAR(255),
    to_city VARCHAR(100),
    to_state VARCHAR(20),
    to_zip VARCHAR(20),
    api_key_label VARCHAR(100),
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng giá cước vận chuyển
CREATE TABLE pricing (
    service_key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time VARCHAR(100),
    carrier VARCHAR(50),
    max_weight VARCHAR(50),
    provider_prices JSONB,  -- Thông số cấu hình giá gốc từ nhà mạng
    prices JSONB,           -- Cấu hình mốc giá bán ra của Admin (Nullable)
    is_active BOOLEAN DEFAULT false
);

-- Bảng cấu hình hệ thống
CREATE TABLE settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Bảng API Logs
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50),
    endpoint VARCHAR(255) NOT NULL,
    request_body JSONB,
    response_body JSONB,
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- 4. INSERT DỮ LIỆU MẪU (SEED DATA)
-- Dữ liệu này được trích xuất từ mock data tĩnh hiện tại.
-- ==============================================================================

-- Seed: Admin User (Mật khẩu 'admin' mặc định đang được mã hóa base64 là 'YWRtaW4=')
INSERT INTO users (username, password, name, email, role, balance) VALUES 
('admin', 'YWRtaW4=', 'Administrator', 'admin@shiplabel.net', 'admin', 0.00)
ON CONFLICT (username) DO NOTHING;

-- Seed: Bảng giá (Sử dụng mảng JSON dể lưu mốc giá theo weight_ranges)
INSERT INTO pricing (service_key, name, time, carrier, prices) VALUES 
('usps_ground', 'USPS Ground', '2-5 Business days', 'usps', '[6, 8, 10, 14, 18]'::jsonb),
('usps_priority', 'USPS Priority', '1-3 Business days', 'usps', '[7, 9, 14, 18, 24]'::jsonb),
('usps_express', 'USPS Express', 'Next day to 2 day', 'usps', '[9, 12, 16, 22, 26]'::jsonb),
('ups_nextday', 'UPS Next Day', 'Overnight by 9:00 pm', 'ups', '[10, 15, 18, 24, 30]'::jsonb),
('ups_nextday_early', 'UPS Next Day Early/Sat', 'Overnight by 11:00 am', 'ups', '[14, 18, 24, 28, 35]'::jsonb)
ON CONFLICT (service_key) DO NOTHING;

-- Seed: Cài đặt hệ thống
INSERT INTO settings (key, value) VALUES 
('master_api', '1779|80Ak8rf6cbMTQ2tKgwlLcuayMVQjtXAiLuV0dngN8628a916'),
('invite_code', 'SHIP'),
('open_register', 'false')
ON CONFLICT (key) DO NOTHING;

-- Hoàn tất
-- Script này đã an toàn để chạy trực tiếp vào Dbeaver hoặc TablePlus.
