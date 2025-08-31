-- Enhance image_descriptions table with detailed fields
ALTER TABLE image_descriptions 
ADD COLUMN IF NOT EXISTS modality VARCHAR(20) CHECK (modality IN ('transthoracic', 'transesophageal', 'non-echo')),
ADD COLUMN IF NOT EXISTS echo_view VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_type VARCHAR(10) DEFAULT 'still' CHECK (image_type IN ('still', 'cine'));

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_image_descriptions_modality ON image_descriptions(modality);
CREATE INDEX IF NOT EXISTS idx_image_descriptions_image_type ON image_descriptions(image_type);

-- Update existing records to have default values where needed
UPDATE image_descriptions SET image_type = 'still' WHERE image_type IS NULL;