-- Add missing short_code column to partners table
-- This column is used for internal partner identification

-- Add short_code column to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS short_code TEXT;

-- Create index for short_code lookups
CREATE INDEX IF NOT EXISTS idx_partners_short_code ON partners(short_code);

-- Update existing partners with their short codes
UPDATE partners 
SET short_code = 'KGL'
WHERE name = 'Kulman Group Limited';

UPDATE partners 
SET short_code = 'FINSAFE'
WHERE name = 'Finsafe Limited';

UPDATE partners 
SET short_code = 'ABC'
WHERE name = 'ABC Limited';

-- Add comment to document the column purpose
COMMENT ON COLUMN partners.short_code IS 'Internal business identifier for the partner (e.g., KGL, FINSAFE, ABC)';









