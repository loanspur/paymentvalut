-- Simple SMS migration - Step by step approach
-- This will check what exists and create/add only what's needed

-- Step 1: Check what tables exist and create them if needed
DO $$
BEGIN
    -- Create partner_sms_settings table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_sms_settings') THEN
        CREATE TABLE partner_sms_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(id) ON DELETE CASCADE UNIQUE,
            damza_api_key VARCHAR(255),
            damza_sender_id VARCHAR(50),
            damza_username VARCHAR(255),
            damza_password VARCHAR(255),
            sms_enabled BOOLEAN DEFAULT TRUE,
            low_balance_threshold DECIMAL(15,2) DEFAULT 1000,
            notification_phone_numbers JSONB DEFAULT '[]',
            sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created partner_sms_settings table';
    ELSE
        RAISE NOTICE 'partner_sms_settings table already exists';
    END IF;
END $$;

-- Step 2: Create sms_templates table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_templates') THEN
        CREATE TABLE sms_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
            template_name VARCHAR(100),
            template_type VARCHAR(50),
            template_content TEXT,
            variables JSONB DEFAULT '[]',
            is_active BOOLEAN DEFAULT TRUE,
            is_default BOOLEAN DEFAULT FALSE,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created sms_templates table';
    ELSE
        RAISE NOTICE 'sms_templates table already exists';
    END IF;
END $$;

-- Step 3: Create sms_notifications table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_notifications') THEN
        CREATE TABLE sms_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
            template_id UUID,
            recipient_phone VARCHAR(20),
            message_type VARCHAR(50),
            message_content TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            damza_reference VARCHAR(100),
            damza_sender_id VARCHAR(50),
            sms_cost DECIMAL(10,4) DEFAULT 0.00,
            wallet_transaction_id UUID,
            error_message TEXT,
            sent_at TIMESTAMP,
            delivered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created sms_notifications table';
    ELSE
        RAISE NOTICE 'sms_notifications table already exists';
    END IF;
END $$;

-- Step 4: Add missing columns to existing tables
DO $$
BEGIN
    -- Add sms_cost column to sms_notifications if it doesn't exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_notifications') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'sms_cost') THEN
            ALTER TABLE sms_notifications ADD COLUMN sms_cost DECIMAL(10,4) DEFAULT 0.00;
            RAISE NOTICE 'Added sms_cost column to sms_notifications';
        ELSE
            RAISE NOTICE 'sms_cost column already exists in sms_notifications';
        END IF;
    END IF;
END $$;

-- Step 5: Add other missing columns to sms_notifications
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_notifications') THEN
        -- Add template_id column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'template_id') THEN
            ALTER TABLE sms_notifications ADD COLUMN template_id UUID;
            RAISE NOTICE 'Added template_id column to sms_notifications';
        END IF;
        
        -- Add message_type column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'message_type') THEN
            ALTER TABLE sms_notifications ADD COLUMN message_type VARCHAR(50);
            RAISE NOTICE 'Added message_type column to sms_notifications';
        END IF;
        
        -- Add message_content column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'message_content') THEN
            ALTER TABLE sms_notifications ADD COLUMN message_content TEXT;
            RAISE NOTICE 'Added message_content column to sms_notifications';
        END IF;
        
        -- Add status column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'status') THEN
            ALTER TABLE sms_notifications ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
            RAISE NOTICE 'Added status column to sms_notifications';
        END IF;
        
        -- Add damza_reference column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'damza_reference') THEN
            ALTER TABLE sms_notifications ADD COLUMN damza_reference VARCHAR(100);
            RAISE NOTICE 'Added damza_reference column to sms_notifications';
        END IF;
        
        -- Add damza_sender_id column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'damza_sender_id') THEN
            ALTER TABLE sms_notifications ADD COLUMN damza_sender_id VARCHAR(50);
            RAISE NOTICE 'Added damza_sender_id column to sms_notifications';
        END IF;
        
        -- Add wallet_transaction_id column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'wallet_transaction_id') THEN
            ALTER TABLE sms_notifications ADD COLUMN wallet_transaction_id UUID;
            RAISE NOTICE 'Added wallet_transaction_id column to sms_notifications';
        END IF;
        
        -- Add error_message column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'error_message') THEN
            ALTER TABLE sms_notifications ADD COLUMN error_message TEXT;
            RAISE NOTICE 'Added error_message column to sms_notifications';
        END IF;
        
        -- Add sent_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'sent_at') THEN
            ALTER TABLE sms_notifications ADD COLUMN sent_at TIMESTAMP;
            RAISE NOTICE 'Added sent_at column to sms_notifications';
        END IF;
        
        -- Add delivered_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'delivered_at') THEN
            ALTER TABLE sms_notifications ADD COLUMN delivered_at TIMESTAMP;
            RAISE NOTICE 'Added delivered_at column to sms_notifications';
        END IF;
        
        -- Add created_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'created_at') THEN
            ALTER TABLE sms_notifications ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to sms_notifications';
        END IF;
        
        -- Add updated_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_notifications' AND column_name = 'updated_at') THEN
            ALTER TABLE sms_notifications ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to sms_notifications';
        END IF;
    END IF;
END $$;

-- Step 6: Add missing columns to partner_sms_settings
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'partner_sms_settings') THEN
        -- Add sms_charge_per_message column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'sms_charge_per_message') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN sms_charge_per_message DECIMAL(10,4) DEFAULT 0.50;
            RAISE NOTICE 'Added sms_charge_per_message column to partner_sms_settings';
        END IF;
        
        -- Add other missing columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_api_key') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_api_key VARCHAR(255);
            RAISE NOTICE 'Added damza_api_key column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_sender_id') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_sender_id VARCHAR(50);
            RAISE NOTICE 'Added damza_sender_id column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_username') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_username VARCHAR(255);
            RAISE NOTICE 'Added damza_username column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'damza_password') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN damza_password VARCHAR(255);
            RAISE NOTICE 'Added damza_password column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'sms_enabled') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN sms_enabled BOOLEAN DEFAULT TRUE;
            RAISE NOTICE 'Added sms_enabled column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'low_balance_threshold') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN low_balance_threshold DECIMAL(15,2) DEFAULT 1000;
            RAISE NOTICE 'Added low_balance_threshold column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'notification_phone_numbers') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN notification_phone_numbers JSONB DEFAULT '[]';
            RAISE NOTICE 'Added notification_phone_numbers column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'created_at') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to partner_sms_settings';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'partner_sms_settings' AND column_name = 'updated_at') THEN
            ALTER TABLE partner_sms_settings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to partner_sms_settings';
        END IF;
    END IF;
END $$;

-- Step 7: Add missing columns to sms_templates
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sms_templates') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'template_name') THEN
            ALTER TABLE sms_templates ADD COLUMN template_name VARCHAR(100);
            RAISE NOTICE 'Added template_name column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'template_type') THEN
            ALTER TABLE sms_templates ADD COLUMN template_type VARCHAR(50);
            RAISE NOTICE 'Added template_type column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'template_content') THEN
            ALTER TABLE sms_templates ADD COLUMN template_content TEXT;
            RAISE NOTICE 'Added template_content column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'variables') THEN
            ALTER TABLE sms_templates ADD COLUMN variables JSONB DEFAULT '[]';
            RAISE NOTICE 'Added variables column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'is_active') THEN
            ALTER TABLE sms_templates ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
            RAISE NOTICE 'Added is_active column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'is_default') THEN
            ALTER TABLE sms_templates ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Added is_default column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'created_by') THEN
            ALTER TABLE sms_templates ADD COLUMN created_by UUID;
            RAISE NOTICE 'Added created_by column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'created_at') THEN
            ALTER TABLE sms_templates ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to sms_templates';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sms_templates' AND column_name = 'updated_at') THEN
            ALTER TABLE sms_templates ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column to sms_templates';
        END IF;
    END IF;
END $$;

-- Step 8: Create sms_bulk_campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_bulk_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID,
    message_content TEXT NOT NULL,
    recipient_list JSONB NOT NULL DEFAULT '[]',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 9: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_partner_sms_settings_partner_id ON partner_sms_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_partner_id ON sms_templates(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_partner_id ON sms_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(status);

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'SMS migration completed successfully!';
    RAISE NOTICE 'All SMS tables and columns have been created/updated.';
END $$;
