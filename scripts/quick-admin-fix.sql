-- Quick fix: Just create the admin user
-- Use this if tables already exist but admin user is missing

-- Create default admin user (password: admin123 - should be changed immediately)
INSERT INTO users (email, password_hash, role, is_active) VALUES 
('admin@mpesavault.com', '$2b$10$NiZIoyI7wYSdX5DWCNO.FuBoxWEiOL0besq4PNqWyhX/WFTiXXhxS', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Verify admin user was created
SELECT 
    id,
    email, 
    role, 
    is_active, 
    created_at 
FROM users 
WHERE email = 'admin@mpesavault.com';

-- Success message
SELECT 'Admin user created/verified successfully!' as status;
