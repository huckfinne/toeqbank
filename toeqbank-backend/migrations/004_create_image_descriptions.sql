-- Migration: Create image_descriptions table
-- This table stores placeholder descriptions for images that will be added later

CREATE TABLE IF NOT EXISTS image_descriptions (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  usage_type VARCHAR(20) NOT NULL CHECK(usage_type IN ('question', 'explanation')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_image_descriptions_question_id ON image_descriptions(question_id);
CREATE INDEX IF NOT EXISTS idx_image_descriptions_usage_type ON image_descriptions(usage_type);