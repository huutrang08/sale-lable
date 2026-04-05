-- Bảng chứa nhật ký lỗi hệ thống tự động
SET search_path TO sales;

CREATE TABLE IF NOT EXISTS sales.system_exceptions (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_exceptions_created_at ON sales.system_exceptions (created_at DESC);
