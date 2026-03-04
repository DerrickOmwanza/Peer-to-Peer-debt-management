-- Drop tables if they exist (for testing)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS repayments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  wallet_balance DECIMAL(15, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans Table (debt agreements)
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  principal_amount DECIMAL(15, 2) NOT NULL,
  remaining_balance DECIMAL(15, 2) NOT NULL,
  repayment_method VARCHAR(20) NOT NULL, -- 'fixed' or 'percentage'
  repayment_amount DECIMAL(15, 2) NOT NULL, -- fixed amount or percentage
  repayment_start_date DATE NOT NULL,
  repayment_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, etc.
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, defaulted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table (incoming transactions that trigger repayment)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- incoming, outgoing
  description VARCHAR(255),
  source_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repayments Table (recorded repayments)
CREATE TABLE repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount_deducted DECIMAL(15, 2) NOT NULL,
  remaining_balance_after DECIMAL(15, 2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'completed', -- completed, failed, pending
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  repayment_id UUID REFERENCES repayments(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL, -- loan_request, approval, repayment, alert
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread', -- unread, read
  delivery_method VARCHAR(20) DEFAULT 'email', -- email, sms, in_app
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_repayments_loan ON repayments(loan_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
