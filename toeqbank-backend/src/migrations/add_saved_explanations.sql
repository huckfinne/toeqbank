-- Create table for saved source note explanations
CREATE TABLE IF NOT EXISTS saved_explanations (
    id SERIAL PRIMARY KEY,
    explanation TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_explanations_usage ON saved_explanations(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_explanations_created_by ON saved_explanations(created_by);