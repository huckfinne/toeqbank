-- Add source_url column to images table if it doesn't exist
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS source_url TEXT;