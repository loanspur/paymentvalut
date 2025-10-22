-- Check Partner Credentials
-- This SQL script helps diagnose credential issues

-- Check if the partners table has the required credential columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'partners' 
  AND column_name IN (
    'consumer_key', 
    'consumer_secret', 
    'initiator_password', 
    'security_credential', 
    'encrypted_credentials',
    'mpesa_initiator_name',
    'mpesa_shortcode',
    'mpesa_environment'
  )
ORDER BY column_name;

-- Check partner data (without exposing actual credentials)
SELECT 
  id,
  name,
  is_active,
  is_mpesa_configured,
  CASE 
    WHEN consumer_key IS NOT NULL THEN 'HAS_CONSUMER_KEY'
    ELSE 'MISSING_CONSUMER_KEY'
  END as consumer_key_status,
  CASE 
    WHEN consumer_secret IS NOT NULL THEN 'HAS_CONSUMER_SECRET'
    ELSE 'MISSING_CONSUMER_SECRET'
  END as consumer_secret_status,
  CASE 
    WHEN initiator_password IS NOT NULL THEN 'HAS_INITIATOR_PASSWORD'
    ELSE 'MISSING_INITIATOR_PASSWORD'
  END as initiator_password_status,
  CASE 
    WHEN security_credential IS NOT NULL THEN 'HAS_SECURITY_CREDENTIAL'
    ELSE 'MISSING_SECURITY_CREDENTIAL'
  END as security_credential_status,
  CASE 
    WHEN encrypted_credentials IS NOT NULL THEN 'HAS_ENCRYPTED_CREDENTIALS'
    ELSE 'MISSING_ENCRYPTED_CREDENTIALS'
  END as encrypted_credentials_status,
  mpesa_initiator_name,
  mpesa_shortcode,
  mpesa_environment
FROM partners
WHERE is_active = true
ORDER BY name;

-- Check for any recent disbursement errors
SELECT 
  id,
  status,
  result_code,
  result_desc,
  created_at,
  partner_id
FROM disbursement_requests
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND (status = 'failed' OR result_code IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;


