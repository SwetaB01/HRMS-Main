
-- Add type column to holidays table
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type VARCHAR NOT NULL DEFAULT 'National';
