-- Fix balance_check_id constraint
-- This migration makes the balance_check_id column nullable to fix the alert creation issue

-- Make balance_check_id nullable in balance_alerts table
ALTER TABLE balance_alerts 
ALTER COLUMN balance_check_id DROP NOT NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN balance_alerts.balance_check_id IS 'Optional reference to balance_checks table. Can be null for alerts not tied to specific balance checks.';
