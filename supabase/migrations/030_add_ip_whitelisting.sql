-- Add IP whitelisting columns to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS allowed_ips TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_whitelist_enabled BOOLEAN DEFAULT false;

-- Add comment explaining the IP whitelisting functionality
COMMENT ON COLUMN partners.allowed_ips IS 'Array of IP addresses allowed to make requests for this partner';
COMMENT ON COLUMN partners.ip_whitelist_enabled IS 'Whether IP whitelisting is enabled for this partner';

-- Create index for IP whitelisting queries
CREATE INDEX IF NOT EXISTS idx_partners_ip_whitelist ON partners USING GIN (allowed_ips);

-- Update existing partners with IP whitelisting disabled by default
UPDATE partners 
SET ip_whitelist_enabled = false 
WHERE ip_whitelist_enabled IS NULL;

-- Example: Enable IP whitelisting for Kulman Group with their USSD server IPs
-- UPDATE partners 
-- SET allowed_ips = ARRAY['192.168.1.100', '10.0.0.50', '203.0.113.10'],
--     ip_whitelist_enabled = true
-- WHERE name = 'Kulman Group Limited';

-- Example: Enable IP whitelisting for Finsef with their USSD server IPs  
-- UPDATE partners
-- SET allowed_ips = ARRAY['192.168.2.100', '10.0.0.51', '203.0.113.11'],
--     ip_whitelist_enabled = true
-- WHERE name = 'Finsef Limited';
