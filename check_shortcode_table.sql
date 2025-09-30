-- Check the structure of user_shortcode_access table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_shortcode_access' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any records in the table
SELECT COUNT(*) as record_count FROM user_shortcode_access;
