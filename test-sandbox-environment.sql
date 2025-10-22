-- Test with sandbox environment first
-- This will help us determine if the issue is with production permissions

-- Update partners to use sandbox environment temporarily
UPDATE partners 
SET mpesa_environment = 'sandbox'
WHERE name IN ('Finsafe Limited', 'Kulman Group Limited');

-- Verify the update
SELECT 
    'SANDBOX ENVIRONMENT TEST' as check_type,
    p.name,
    p.mpesa_shortcode,
    p.mpesa_environment,
    p.mpesa_initiator_name
FROM partners p
WHERE p.is_active = true
ORDER BY p.name;

-- Note: After testing, you can revert back to production with:
-- UPDATE partners SET mpesa_environment = 'production' WHERE name IN ('Finsafe Limited', 'Kulman Group Limited');

