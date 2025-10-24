-- Check the specific partner that's failing with initiator error
-- Partner ID: 550e8400-e29b-41d4-a716-446655440000

SELECT 
  id,
  name,
  is_active,
  is_mpesa_configured,
  mpesa_initiator_name,
  mpesa_shortcode,
  mpesa_environment,
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
  END as encrypted_credentials_status
FROM partners
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Also check the working partner for comparison
SELECT 
  id,
  name,
  is_active,
  is_mpesa_configured,
  mpesa_initiator_name,
  mpesa_shortcode,
  mpesa_environment,
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
  END as encrypted_credentials_status
FROM partners
WHERE id = '660e8400-e29b-41d4-a716-446655440001';





