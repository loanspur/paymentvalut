-- Create system settings table for global configuration
-- This will store system-wide settings like NCBA Paybill configuration

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (encrypted if is_encrypted is true)';
COMMENT ON COLUMN system_settings.setting_type IS 'Data type of the setting value';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of what this setting does';
COMMENT ON COLUMN system_settings.is_encrypted IS 'Whether the setting value is encrypted';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at') THEN
        CREATE TRIGGER update_system_settings_updated_at 
        BEFORE UPDATE ON system_settings 
        FOR EACH ROW EXECUTE FUNCTION update_system_settings_updated_at();
    END IF;
END $$;

-- Insert default NCBA system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_encrypted) VALUES
('ncba_business_short_code', '880100', 'string', 'NCBA Paybill business short code (global)', FALSE),
('ncba_notification_username', '', 'string', 'Username for NCBA Paybill Push Notification authentication', TRUE),
('ncba_notification_password', '', 'string', 'Password for NCBA Paybill Push Notification authentication', TRUE),
('ncba_notification_secret_key', '', 'string', 'Secret key for generating and validating notification hashes', TRUE),
('ncba_notification_endpoint_url', '', 'string', 'Endpoint URL where NCBA will send payment notifications', FALSE),
('ncba_account_number', '123456', 'string', 'NCBA account number for paybill payments', FALSE),
('ncba_account_reference_separator', '#', 'string', 'Separator between account number and partner ID', FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
