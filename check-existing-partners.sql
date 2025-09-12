-- Check existing partners in the database
SELECT 
    id,
    name,
    short_code,
    mpesa_shortcode,
    mpesa_consumer_key,
    mpesa_environment,
    is_mpesa_configured,
    api_key_hash
FROM partners 
ORDER BY name;


