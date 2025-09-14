-- Add created_by field to track who created each image description
ALTER TABLE image_descriptions 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Create index for better performance when querying image descriptions by user
CREATE INDEX IF NOT EXISTS idx_image_descriptions_created_by ON image_descriptions(created_by);