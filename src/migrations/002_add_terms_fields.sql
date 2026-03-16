-- Migration: Add Terms & Conditions fields to loans table
-- Supports T&C enforcement and loan agreement linkage

ALTER TABLE loans ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS agreement_id UUID;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS lender_name VARCHAR(255);
