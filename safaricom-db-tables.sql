-- Safaricom M-PESA Integration Tables
-- Add to existing PostgreSQL database

-- ============================================================================
-- M-PESA REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS m_pesa_requests (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- STK_PUSH, B2C, C2B, etc.
  phone_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  loan_id UUID REFERENCES loans(id),
  borrower_id UUID REFERENCES users(id),
  checkout_request_id VARCHAR(255),
  merchant_request_id VARCHAR(255),
  response_code VARCHAR(10),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, failed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(checkout_request_id)
);

CREATE INDEX idx_m_pesa_requests_phone ON m_pesa_requests(phone_number);
CREATE INDEX idx_m_pesa_requests_loan ON m_pesa_requests(loan_id);
CREATE INDEX idx_m_pesa_requests_status ON m_pesa_requests(status);
CREATE INDEX idx_m_pesa_requests_created ON m_pesa_requests(created_at);

-- ============================================================================
-- M-PESA TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS m_pesa_transactions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  receipt_number VARCHAR(255),
  bill_reference VARCHAR(255),  -- Used to match loans: LOAN-{loanId}
  transaction_time VARCHAR(50),
  status VARCHAR(50) DEFAULT 'completed',
  mpesa_charges DECIMAL(10, 2) DEFAULT 0,
  mpesa_balance DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_m_pesa_transactions_phone ON m_pesa_transactions(phone_number);
CREATE INDEX idx_m_pesa_transactions_tx_id ON m_pesa_transactions(transaction_id);
CREATE INDEX idx_m_pesa_transactions_reference ON m_pesa_transactions(bill_reference);
CREATE INDEX idx_m_pesa_transactions_created ON m_pesa_transactions(created_at);

-- ============================================================================
-- M-PESA DISBURSEMENTS TABLE (B2C Payments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS m_pesa_disbursements (
  id SERIAL PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id),
  borrower_phone VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  conversation_id VARCHAR(255) UNIQUE NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',  -- pending, completed, failed
  result_code VARCHAR(10),
  result_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_m_pesa_disbursements_loan ON m_pesa_disbursements(loan_id);
CREATE INDEX idx_m_pesa_disbursements_phone ON m_pesa_disbursements(borrower_phone);
CREATE INDEX idx_m_pesa_disbursements_status ON m_pesa_disbursements(status);
CREATE INDEX idx_m_pesa_disbursements_created ON m_pesa_disbursements(created_at);

-- ============================================================================
-- SAFARICOM CALLBACKS TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS safaricom_callbacks (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- C2B_VALIDATION, C2B_CONFIRMATION, B2C_RESULT, etc.
  data JSONB NOT NULL,
  ip_address VARCHAR(45),
  signature VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_safaricom_callbacks_type ON safaricom_callbacks(type);
CREATE INDEX idx_safaricom_callbacks_created ON safaricom_callbacks(created_at);

-- ============================================================================
-- SAFARICOM TOKENS TABLE (OAuth Token Management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS safaricom_tokens (
  id SERIAL PRIMARY KEY,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  obtained_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(access_token)
);

CREATE INDEX idx_safaricom_tokens_expires ON safaricom_tokens(expires_at);

-- ============================================================================
-- SAFARICOM ACCOUNT BALANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS safaricom_account_balance (
  id SERIAL PRIMARY KEY,
  balance DECIMAL(12, 2) NOT NULL,
  working_account_balance DECIMAL(12, 2),
  float_account_balance DECIMAL(12, 2),
  reserve_account_balance DECIMAL(12, 2),
  unavailable_account_balance DECIMAL(12, 2),
  result_code VARCHAR(10),
  result_description TEXT,
  conversation_id VARCHAR(255),
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_account_balance_checked ON safaricom_account_balance(checked_at);

-- ============================================================================
-- SAFARICOM ERROR LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS safaricom_error_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_code VARCHAR(50),
  error_message TEXT,
  http_status_code INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_safaricom_error_logs_endpoint ON safaricom_error_logs(endpoint);
CREATE INDEX idx_safaricom_error_logs_created ON safaricom_error_logs(created_at);
CREATE INDEX idx_safaricom_error_logs_resolved ON safaricom_error_logs(resolved_at);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert test M-PESA request
INSERT INTO m_pesa_requests (type, phone_number, amount, status)
VALUES ('STK_PUSH', '254701234567', 500.00, 'completed')
ON CONFLICT DO NOTHING;

-- Insert test transaction
INSERT INTO m_pesa_transactions (
  phone_number, amount, transaction_id, receipt_number,
  bill_reference, transaction_time, status
) VALUES (
  '254701234567', 1000.00, 'SAF123456789',
  'SAF789456', 'LOAN-loan-001',
  '20251130100000', 'completed'
)
ON CONFLICT(transaction_id) DO NOTHING;

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- View: Recent M-PESA transactions
CREATE OR REPLACE VIEW v_recent_m_pesa_transactions AS
SELECT
  t.id,
  t.phone_number,
  t.amount,
  t.transaction_id,
  t.receipt_number,
  t.bill_reference,
  t.status,
  t.created_at,
  u.name as user_name,
  u.email as user_email
FROM m_pesa_transactions t
LEFT JOIN users u ON t.phone_number = u.phone
ORDER BY t.created_at DESC;

-- View: Pending M-PESA requests
CREATE OR REPLACE VIEW v_pending_m_pesa_requests AS
SELECT
  r.id,
  r.type,
  r.phone_number,
  r.amount,
  r.loan_id,
  r.checkout_request_id,
  r.status,
  r.created_at,
  EXTRACT(HOUR FROM NOW() - r.created_at) as hours_pending
FROM m_pesa_requests r
WHERE r.status = 'pending'
  AND r.created_at > NOW() - INTERVAL '24 hours'
ORDER BY r.created_at DESC;

-- View: Daily M-PESA summary
CREATE OR REPLACE VIEW v_daily_m_pesa_summary AS
SELECT
  DATE(t.created_at) as transaction_date,
  COUNT(*) as transaction_count,
  SUM(t.amount) as total_amount,
  AVG(t.amount) as average_amount,
  MIN(t.amount) as min_amount,
  MAX(t.amount) as max_amount
FROM m_pesa_transactions t
WHERE t.status = 'completed'
GROUP BY DATE(t.created_at)
ORDER BY transaction_date DESC;

-- ============================================================================
-- END OF SAFARICOM TABLES
-- ============================================================================
