-- Enhanced Duplicate Prevention System
-- This migration adds comprehensive safeguards against duplicate disbursements

-- Create disbursement_restrictions table for advanced duplicate prevention
CREATE TABLE IF NOT EXISTS disbursement_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Restriction types
    restriction_type VARCHAR(50) NOT NULL CHECK (restriction_type IN (
        'same_customer_amount_time',  -- Same customer + amount within time window
        'same_ip_time',              -- Same IP within time window  
        'same_customer_daily_limit', -- Daily limit per customer
        'same_ip_daily_limit',       -- Daily limit per IP
        'insufficient_funds_queue'   -- Queue when insufficient funds
    )),
    
    -- Configuration
    time_window_minutes INTEGER DEFAULT 5,  -- Time window for restrictions
    daily_limit_amount DECIMAL(15,2),       -- Daily limit amount
    daily_limit_count INTEGER,              -- Daily limit count
    is_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disbursement_blocks table to track blocked requests
CREATE TABLE IF NOT EXISTS disbursement_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Blocking criteria
    block_type VARCHAR(50) NOT NULL CHECK (block_type IN (
        'duplicate_customer_amount',
        'duplicate_ip',
        'daily_limit_exceeded',
        'insufficient_funds'
    )),
    
    -- Identifiers
    customer_id TEXT,
    msisdn TEXT,
    amount DECIMAL(15,2),
    client_ip TEXT,
    
    -- Block details
    block_reason TEXT NOT NULL,
    block_expires_at TIMESTAMP WITH TIME ZONE,
    original_request_id UUID REFERENCES disbursement_requests(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create insufficient_funds_queue table for intelligent queue management
CREATE TABLE IF NOT EXISTS insufficient_funds_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Request details
    disbursement_request_id UUID NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    msisdn TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    client_ip TEXT,
    
    -- Queue management
    priority INTEGER DEFAULT 1,  -- 1=high, 2=medium, 3=low
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'expired')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_disbursement_restrictions_partner_type ON disbursement_restrictions(partner_id, restriction_type);
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_partner_type ON disbursement_blocks(partner_id, block_type);
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_expires ON disbursement_blocks(block_expires_at) WHERE block_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_customer ON disbursement_blocks(customer_id, partner_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_blocks_ip ON disbursement_blocks(client_ip, partner_id) WHERE client_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_partner ON insufficient_funds_queue(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_retry ON insufficient_funds_queue(next_retry_at, status) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insufficient_funds_queue_priority ON insufficient_funds_queue(priority, created_at);

-- Add composite indexes for duplicate detection
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_customer_amount_time ON disbursement_requests(partner_id, customer_id, amount, created_at);
CREATE INDEX IF NOT EXISTS idx_disbursement_requests_ip_time ON disbursement_requests(partner_id, created_at) WHERE origin = 'ussd';

-- Insert default restrictions for all partners
INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, is_enabled)
SELECT 
    id as partner_id,
    'same_customer_amount_time' as restriction_type,
    5 as time_window_minutes,
    true as is_enabled
FROM partners 
WHERE is_active = true;

INSERT INTO disbursement_restrictions (partner_id, restriction_type, time_window_minutes, is_enabled)
SELECT 
    id as partner_id,
    'same_ip_time' as restriction_type,
    2 as time_window_minutes,
    true as is_enabled
FROM partners 
WHERE is_active = true;

INSERT INTO disbursement_restrictions (partner_id, restriction_type, daily_limit_amount, daily_limit_count, is_enabled)
SELECT 
    id as partner_id,
    'same_customer_daily_limit' as restriction_type,
    50000.00 as daily_limit_amount,
    10 as daily_limit_count,
    true as is_enabled
FROM partners 
WHERE is_active = true;

INSERT INTO disbursement_restrictions (partner_id, restriction_type, daily_limit_amount, daily_limit_count, is_enabled)
SELECT 
    id as partner_id,
    'same_ip_daily_limit' as restriction_type,
    100000.00 as daily_limit_amount,
    20 as daily_limit_count,
    true as is_enabled
FROM partners 
WHERE is_active = true;

INSERT INTO disbursement_restrictions (partner_id, restriction_type, is_enabled)
SELECT 
    id as partner_id,
    'insufficient_funds_queue' as restriction_type,
    true as is_enabled
FROM partners 
WHERE is_active = true;

-- Add comments
COMMENT ON TABLE disbursement_restrictions IS 'Configuration for duplicate prevention and rate limiting';
COMMENT ON TABLE disbursement_blocks IS 'Tracks blocked disbursement requests with expiration times';
COMMENT ON TABLE insufficient_funds_queue IS 'Queues disbursements when insufficient funds, with intelligent retry logic';
