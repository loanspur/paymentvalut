-- Check database status and what's missing
-- Run this first to see what needs to be created

-- Check if user_role enum exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
        THEN '✅ user_role enum exists'
        ELSE '❌ user_role enum missing'
    END as enum_status;

-- Check if users table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
        THEN '✅ users table exists'
        ELSE '❌ users table missing'
    END as users_table_status;

-- Check if user_sessions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions' AND table_schema = 'public') 
        THEN '✅ user_sessions table exists'
        ELSE '❌ user_sessions table missing'
    END as sessions_table_status;

-- Check if partner_shortcodes table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_shortcodes' AND table_schema = 'public') 
        THEN '✅ partner_shortcodes table exists'
        ELSE '❌ partner_shortcodes table missing'
    END as shortcodes_table_status;

-- Check if audit_logs table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') 
        THEN '✅ audit_logs table exists'
        ELSE '❌ audit_logs table missing'
    END as audit_logs_status;

-- Check if admin user exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM users WHERE email = 'admin@mpesavault.com') 
        THEN '✅ Admin user exists'
        ELSE '❌ Admin user missing'
    END as admin_user_status;

-- Show all existing tables
SELECT 'Existing tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show admin user details (if exists)
SELECT 'Admin user details:' as info;
SELECT 
    id,
    email, 
    role, 
    is_active, 
    created_at 
FROM users 
WHERE email = 'admin@mpesavault.com';
