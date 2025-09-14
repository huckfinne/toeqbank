-- Add review system for images
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'images' AND column_name = 'review_status') THEN
        ALTER TABLE images ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'images' AND column_name = 'review_rating') THEN
        ALTER TABLE images ADD COLUMN review_rating INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'images' AND column_name = 'reviewed_by') THEN
        ALTER TABLE images ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'images' AND column_name = 'reviewed_at') THEN
        ALTER TABLE images ADD COLUMN reviewed_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_images_review_status') THEN
        CREATE INDEX idx_images_review_status ON images(review_status, created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_images_reviewed_by') THEN
        CREATE INDEX idx_images_reviewed_by ON images(reviewed_by);
    END IF;
END $$;