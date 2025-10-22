-- Relaxed Duplicate Prevention Rules Migration
-- This migration implements configurable time windows and amount tolerance for duplicate prevention

-- Add new restriction types for relaxed rules
ALTER TABLE disbursement_restrictions 
DROP CONSTRAINT IF EXISTS disbursement_restrictions_restriction_type_check;

ALTER TABLE disbursement_restrictions 
ADD CONSTRAINT disbursement_restrictions_restriction_type_check 
CHECK (restriction_type IN (
    'same_customer_amount_time',     -- Same customer + amount within time window
    'same_customer_similar_amount',  -- Same customer + similar amount within time window
    'same_ip_time',                  -- Same IP within time window  
    'same_customer_daily_limit',     -- Daily limit per customer
    'same_ip_daily_limit',           -- Daily limit per IP
    'insufficient_funds_queue'       -- Queue when insufficient funds
));

-- Add amount tolerance column for similar amount checks
ALTER TABLE disbursement_restrictions 
ADD COLUMN IF NOT EXISTS amount_tolerance_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Add enhanced logging column
ALTER TABLE disbursement_restrictions 
ADD COLUMN IF NOT EXISTS log_similar_amounts BOOLEAN DEFAULT true;

-- Add action type for different behaviors
ALTER TABLE disbursement_restrictions 
ADD COLUMN IF NOT EXISTS action_type VARCHAR(20) DEFAULT 'block' 
CHECK (action_type IN ('block', 'warn_and_allow', 'rate_limit'));

-- Create enhanced duplicate prevention logs table
CREATE TABLE IF NOT EXISTS duplicate_prevention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    disbursement_request_id UUID REFERENCES disbursement_requests(id) ON DELETE CASCADE,
    
    -- Request details
    customer_id VARCHAR(100),
    msisdn VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    client_ip INET,
    client_request_id VARCHAR(100),
    
    -- Detection details
    detection_type VARCHAR(50) NOT NULL, -- 'exact_duplicate', 'similar_amount', 'same_phone', 'rate_limit'
    restriction_type VARCHAR(50) NOT NULL,
    time_window_minutes INTEGER,
    amount_tolerance_percentage DECIMAL(5,2),
    
    -- Action taken
    action_taken VARCHAR(20) NOT NULL, -- 'blocked', 'allowed_with_warning', 'rate_limited'
    is_legitimate_request BOOLEAN DEFAULT false,
    
    -- Similar amount details (if applicable)
    similar_amounts_found JSONB DEFAULT '[]',
    amount_difference DECIMAL(15,2),
    percentage_difference DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_duplicate_prevention_logs_partner_created 
ON duplicate_prevention_logs(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_duplicate_prevention_logs_detection_type 
ON duplicate_prevention_logs(detection_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_duplicate_prevention_logs_msisdn_amount 
ON duplicate_prevention_logs(msisdn, amount, created_at DESC);

-- Insert default relaxed restrictions for existing partners
INSERT INTO disbursement_restrictions (
    partner_id, 
    restriction_type, 
    time_window_minutes, 
    amount_tolerance_percentage,
    log_similar_amounts,
    action_type,
    is_enabled
)
SELECT 
    p.id as partner_id,
    'same_customer_amount_time' as restriction_type,
    5 as time_window_minutes,  -- Reduced from 24 hours to 5 minutes
    0.00 as amount_tolerance_percentage,  -- Exact amount only
    true as log_similar_amounts,
    'block' as action_type,
    true as is_enabled
FROM partners p
WHERE NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = p.id 
    AND dr.restriction_type = 'same_customer_amount_time'
);

-- Insert similar amount restrictions
INSERT INTO disbursement_restrictions (
    partner_id, 
    restriction_type, 
    time_window_minutes, 
    amount_tolerance_percentage,
    log_similar_amounts,
    action_type,
    is_enabled
)
SELECT 
    p.id as partner_id,
    'same_customer_similar_amount' as restriction_type,
    15 as time_window_minutes,  -- 15 minutes for similar amounts
    10.00 as amount_tolerance_percentage,  -- 10% tolerance
    true as log_similar_amounts,
    'warn_and_allow' as action_type,  -- Allow but log
    true as is_enabled
FROM partners p
WHERE NOT EXISTS (
    SELECT 1 FROM disbursement_restrictions dr 
    WHERE dr.partner_id = p.id 
    AND dr.restriction_type = 'same_customer_similar_amount'
);

-- Update existing same_ip_time restrictions to be more lenient
UPDATE disbursement_restrictions 
SET time_window_minutes = 2  -- Reduced from default to 2 minutes
WHERE restriction_type = 'same_ip_time' 
AND time_window_minutes > 2;

-- Add comment explaining the changes
COMMENT ON TABLE duplicate_prevention_logs IS 'Enhanced logging for relaxed duplicate prevention rules with amount tolerance and configurable time windows';
COMMENT ON COLUMN disbursement_restrictions.amount_tolerance_percentage IS 'Percentage tolerance for similar amount detection (e.g., 10.00 for 10%)';
COMMENT ON COLUMN disbursement_restrictions.log_similar_amounts IS 'Whether to log similar amount transactions for monitoring';
COMMENT ON COLUMN disbursement_restrictions.action_type IS 'Action to take: block, warn_and_allow, or rate_limit';
