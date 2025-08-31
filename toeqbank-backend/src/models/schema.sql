-- Database schema for TOE Question Bank

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_number VARCHAR(50),
    question TEXT NOT NULL,
    choice_a TEXT,
    choice_b TEXT,
    choice_c TEXT,
    choice_d TEXT,
    choice_e TEXT,
    choice_f TEXT,
    choice_g TEXT,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    explanation TEXT,
    source_folder VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Practice tests table
CREATE TABLE IF NOT EXISTS practice_tests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test questions table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS test_questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES practice_tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, question_id),
    UNIQUE(test_id, question_order)
);

-- User responses table (for tracking practice test attempts)
CREATE TABLE IF NOT EXISTS user_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES practice_tests(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    is_correct BOOLEAN NOT NULL,
    response_time_seconds INTEGER,
    session_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES practice_tests(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2)
);

-- Images table for TOE exam stills and cine clips
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('still', 'cine')),
    width INTEGER,
    height INTEGER,
    duration_seconds DECIMAL(5,2), -- for cine clips
    description TEXT,
    tags TEXT[], -- array of tags for searchability
    license VARCHAR(50) NOT NULL CHECK (license IN (
        'mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause', 'cc0-1.0', 
        'cc-by-4.0', 'cc-by-sa-4.0', 'cc-by-nc-4.0', 'cc-by-nc-sa-4.0',
        'copyright-borrowed', 'user-contributed'
    )) DEFAULT 'user-contributed',
    license_details TEXT, -- additional license information or attribution
    source_url TEXT, -- original URL if image was uploaded from URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question images table (many-to-many relationship between questions and images)
CREATE TABLE IF NOT EXISTS question_images (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 1,
    usage_type VARCHAR(20) DEFAULT 'question' CHECK (usage_type IN ('question', 'explanation')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, image_id)
);

-- Question metadata table
CREATE TABLE IF NOT EXISTS question_metadata (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE UNIQUE,
    difficulty VARCHAR(50),
    category VARCHAR(100),
    topic VARCHAR(200),
    keywords TEXT[],
    question_type VARCHAR(50),
    view_type VARCHAR(100),
    major_structures TEXT[],
    minor_structures TEXT[],
    modalities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question exam assignments table
CREATE TABLE IF NOT EXISTS question_exam_assignments (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    exam_name VARCHAR(100) NOT NULL,
    subtopics TEXT[],
    reasoning TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, exam_name)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_questions_source_folder ON questions(source_folder);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON test_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_session_id ON user_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_test_question ON user_responses(test_id, question_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_images_image_type ON images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_images_license ON images(license);
CREATE INDEX IF NOT EXISTS idx_question_images_question_id ON question_images(question_id);
CREATE INDEX IF NOT EXISTS idx_question_images_image_id ON question_images(image_id);
CREATE INDEX IF NOT EXISTS idx_question_metadata_question_id ON question_metadata(question_id);
CREATE INDEX IF NOT EXISTS idx_question_exam_assignments_question_id ON question_exam_assignments(question_id);
CREATE INDEX IF NOT EXISTS idx_question_exam_assignments_exam_name ON question_exam_assignments(exam_name);

-- Image descriptions table (for placeholder descriptions)
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