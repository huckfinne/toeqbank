-- Migration to add choice_f and choice_g columns to questions table
-- This updates existing databases to support 7 answer choices (A through G)

-- Add the new columns
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choice_f TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choice_g TEXT;

-- Update the constraint to allow F and G as valid answers
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_answer_check;
ALTER TABLE questions ADD CONSTRAINT questions_correct_answer_check 
    CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F', 'G'));

-- Update user_responses table constraint as well
ALTER TABLE user_responses DROP CONSTRAINT IF EXISTS user_responses_selected_answer_check;
ALTER TABLE user_responses ADD CONSTRAINT user_responses_selected_answer_check 
    CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E', 'F', 'G'));