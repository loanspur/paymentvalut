-- Add OTP system settings to enable/disable OTP login functionality
-- This migration adds the necessary OTP configuration settings

-- Insert OTP system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_encrypted) VALUES
('login_otp_enabled', 'false', 'boolean', 'Enable OTP login verification system', FALSE),
('otp_expiry_minutes', '10', 'number', 'OTP expiry time in minutes', FALSE),
('otp_max_attempts', '3', 'number', 'Maximum OTP validation attempts', FALSE),
('otp_length', '6', 'number', 'OTP code length', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
setting_type = EXCLUDED.setting_type,
description = EXCLUDED.description,
updated_at = NOW();

-- Add comments
COMMENT ON TABLE system_settings IS 'System-wide configuration settings including OTP settings';

