-- Correct company names in the database
-- Update to proper spellings: "Kulman Group Limited" and "Finsafe Limited"

-- Update Kulmnagroup Limited to Kulman Group Limited
UPDATE partners 
SET name = 'Kulman Group Limited'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Update Finsef Limited to Finsafe Limited  
UPDATE partners 
SET name = 'Finsafe Limited'
WHERE id = '660e8400-e29b-41d4-a716-446655440001';

-- ABC Limited remains the same
-- No changes needed for ABC Limited as the name is already correct






