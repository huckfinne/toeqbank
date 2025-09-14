-- Add uploaded_by field to track who uploaded each image
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id);

-- Create index for better performance when querying images by user
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);

-- Add image_upload_count to users table to track how many images each user has uploaded
ALTER TABLE users
ADD COLUMN IF NOT EXISTS image_upload_count INTEGER DEFAULT 0;

-- Update existing image_upload_count based on current data (if any images exist without uploaded_by, they won't be counted)
UPDATE users u
SET image_upload_count = (
    SELECT COUNT(*) 
    FROM images i 
    WHERE i.uploaded_by = u.id
)
WHERE u.is_image_contributor = true;