-- NOWPayments Integration Setup
-- Update sales schema

SET search_path TO sales;

-- 1. Create payments table
CREATE TABLE IF NOT EXISTS sales.payments (
	id serial4 NOT NULL,
	payment_id varchar(50) NOT NULL,
	order_code varchar(50) NULL, -- Here order_code will store the top-up ID or username context
	payment_method varchar(50) NOT NULL DEFAULT 'NOWPAYMENTS',
	payment_date timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	amount numeric(15, 2) NOT NULL,
	status varchar(20) DEFAULT 'PENDING'::character varying NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	payment_resp text NULL,
	payment_req text NULL,
	payment_redirect text NULL,
	payment_option varchar(50) NULL,
	CONSTRAINT payments_payment_code_unique UNIQUE (payment_id),
	CONSTRAINT payments_pk PRIMARY KEY (id),
	CONSTRAINT payments_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('waiting'::character varying)::text, ('finished'::character varying)::text, ('COMPLETED'::character varying)::text, ('FAILED'::character varying)::text, ('failed'::character varying)::text, ('REFUNDED'::character varying)::text, ('refunded'::character varying)::text, ('CANCELLED'::character varying)::text, ('expired'::character varying)::text])))
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON sales.payments USING btree (order_code);
CREATE INDEX IF NOT EXISTS idx_payments_payment_code ON sales.payments USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON sales.payments USING btree (payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON sales.payments USING btree (payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON sales.payments USING btree (status);

-- 2. Create IPN Logs table
CREATE TABLE IF NOT EXISTS sales.nowpayments_ipn_logs (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(50),
    payment_status VARCHAR(50),
    raw_payload JSONB NOT NULL,
    signature VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ipn_logs_payment_id ON sales.nowpayments_ipn_logs (payment_id);

-- 3. Add default settings for NOWPayments (Replace values in admin dashboard later)
INSERT INTO sales.settings (key, value) VALUES 
('nowpayments_api_key', ''),
('nowpayments_ipn_secret', '')
ON CONFLICT (key) DO NOTHING;
