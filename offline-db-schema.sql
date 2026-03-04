-- M-PESA Debt Allocation System - Offline SQLite Database Schema
-- For Android/iOS Local Storage
-- Created: November 2025

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  wallet_balance REAL DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_synced ON users(synced);

-- ============================================================================
-- LOANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  balance REAL NOT NULL,
  repayment_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  due_date INTEGER,
  completed_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  conflict_resolved BOOLEAN DEFAULT 0,
  FOREIGN KEY(borrower_id) REFERENCES users(id),
  FOREIGN KEY(lender_id) REFERENCES users(id)
);

CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_lender ON loans(lender_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_synced ON loans(synced);
CREATE INDEX idx_loans_borrower_phone ON loans(borrower_phone);
CREATE INDEX idx_loans_lender_phone ON loans(lender_phone);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_type TEXT DEFAULT 'incoming',
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_user_phone ON transactions(user_phone);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_synced ON transactions(synced);

-- ============================================================================
-- REPAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  borrower_phone TEXT NOT NULL,
  lender_phone TEXT NOT NULL,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  sync_timestamp INTEGER,
  FOREIGN KEY(loan_id) REFERENCES loans(id),
  FOREIGN KEY(transaction_id) REFERENCES transactions(id)
);

CREATE INDEX idx_repayments_loan ON repayments(loan_id);
CREATE INDEX idx_repayments_transaction ON repayments(transaction_id);
CREATE INDEX idx_repayments_created ON repayments(created_at);
CREATE INDEX idx_repayments_synced ON repayments(synced);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_phone TEXT NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  created_at INTEGER,
  synced BOOLEAN DEFAULT 0,
  FOREIGN KEY(user_phone) REFERENCES users(phone)
);

CREATE INDEX idx_notifications_user ON notifications(user_phone);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================================
-- SYNC METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_metadata (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT DEFAULT 'insert',
  local_version INTEGER DEFAULT 1,
  server_version INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  last_conflict_at INTEGER,
  conflict_resolution TEXT,
  synced BOOLEAN DEFAULT 0,
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_sync_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX idx_sync_synced ON sync_metadata(synced);

-- ============================================================================
-- OFFLINE QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  last_retry_at INTEGER,
  error_message TEXT,
  synced BOOLEAN DEFAULT 0
);

CREATE UNIQUE INDEX idx_queue_id ON offline_queue(id);
CREATE INDEX idx_queue_synced ON offline_queue(synced);
CREATE INDEX idx_queue_created ON offline_queue(created_at);
CREATE INDEX idx_queue_retry ON offline_queue(retry_count);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample users
INSERT OR IGNORE INTO users (id, phone, name, email, wallet_balance, created_at, updated_at, synced)
VALUES
('user-001', '254701234567', 'John Doe', 'john@example.com', 5000.00, 1701356400000, 1701356400000, 1),
('user-002', '254702345678', 'Jane Smith', 'jane@example.com', 10000.00, 1701356400000, 1701356400000, 1),
('user-003', '254703456789', 'Bob Wilson', 'bob@example.com', 3000.00, 1701356400000, 1701356400000, 1);

-- Insert sample loans
INSERT OR IGNORE INTO loans (id, borrower_id, borrower_phone, lender_id, lender_phone, amount, balance, repayment_amount, status, created_at, updated_at, synced)
VALUES
('loan-001', 'user-001', '254701234567', 'user-002', '254702345678', 5000.00, 4000.00, 500.00, 'approved', 1701356400000, 1701356500000, 1),
('loan-002', 'user-003', '254703456789', 'user-002', '254702345678', 3000.00, 3000.00, 300.00, 'pending', 1701356600000, 1701356600000, 0);

-- Insert sample transactions
INSERT OR IGNORE INTO transactions (id, user_id, user_phone, amount, transaction_type, description, created_at, synced)
VALUES
('tx-001', 'user-001', '254701234567', 1000.00, 'incoming', 'M-PESA received', 1701356600000, 1),
('tx-002', 'user-002', '254702345678', 2000.00, 'incoming', 'M-PESA received', 1701356700000, 1);

-- Insert sample repayments
INSERT OR IGNORE INTO repayments (id, loan_id, transaction_id, amount, balance_after, borrower_phone, lender_phone, created_at, synced)
VALUES
('repay-001', 'loan-001', 'tx-001', 500.00, 4000.00, '254701234567', '254702345678', 1701356600000, 1);

-- Insert sample notifications
INSERT OR IGNORE INTO notifications (id, user_phone, type, title, message, read, created_at)
VALUES
('notif-001', '254702345678', 'LOAN_REQUEST', 'Loan Request', 'New loan request for Ksh 3000', 0, 1701356600000),
('notif-002', '254701234567', 'LOAN_APPROVED', 'Loan Approved', 'Your loan request for Ksh 5000 has been approved', 1, 1701356500000);

-- ============================================================================
-- DATABASE VERSION / MIGRATION TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  description TEXT,
  applied_at INTEGER
);

INSERT OR IGNORE INTO schema_version (version, description, applied_at)
VALUES (1, 'Initial schema with 7 tables', 1701356400000);

-- ============================================================================
-- DATABASE PRAGMA SETTINGS FOR OPTIMAL PERFORMANCE
-- ============================================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Use Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Increase cache size (negative value = KB)
PRAGMA cache_size = -64000;

-- Enable query optimizer
PRAGMA optimize;

-- Set temp store to MEMORY for faster temp operations
PRAGMA temp_store = MEMORY;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
