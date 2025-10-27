-- Add NCBA STK Push credentials to system settings
-- These are separate from notification credentials and are used for STK Push authentication

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_encrypted) VALUES
('ncba_stk_push_username', '', 'string', 'Username for NCBA STK Push authentication (separate from notification credentials)', TRUE),
('ncba_stk_push_password', '', 'string', 'Password for NCBA STK Push authentication (separate from notification credentials)', TRUE),
('ncba_stk_push_passkey', '', 'string', 'Passkey for NCBA STK Push password generation (separate from notification secret key)', TRUE)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_type = EXCLUDED.setting_type,
  description = EXCLUDED.description,
  is_encrypted = EXCLUDED.is_encrypted,
  updated_at = NOW();

-- Add comments for clarity
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (encrypted if is_encrypted is true)';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether the setting value is encrypted';

-- Update existing notification credentials description to clarify their purpose
UPDATE system_settings 
SET description = 'Username for NCBA Paybill Push Notification authentication (for receiving webhook notifications)'
WHERE setting_key = 'ncba_notification_username';

UPDATE system_settings 
SET description = 'Password for NCBA Paybill Push Notification authentication (for receiving webhook notifications)'
WHERE setting_key = 'ncba_notification_password';

UPDATE system_settings 
SET description = 'Secret key for NCBA Paybill Push Notification hash validation (for receiving webhook notifications)'
WHERE setting_key = 'ncba_notification_secret_key';
