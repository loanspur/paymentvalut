-- Create sync log table for tracking sync operations
-- Run this migration before using the sync script

CREATE SCHEMA IF NOT EXISTS mifos;

-- Sync log table to track last sync times
CREATE TABLE IF NOT EXISTS mifos.sync_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    last_sync_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    records_synced BIGINT DEFAULT 0,
    sync_duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'success', -- success, failed, in_progress
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON mifos.sync_log(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_log_last_sync ON mifos.sync_log(last_sync_time);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION mifos.update_sync_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER sync_log_updated_at_trigger
    BEFORE UPDATE ON mifos.sync_log
    FOR EACH ROW
    EXECUTE FUNCTION mifos.update_sync_log_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON mifos.sync_log TO authenticated;
-- GRANT USAGE ON SEQUENCE mifos.sync_log_id_seq TO authenticated;

