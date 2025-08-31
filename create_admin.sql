-- Create admin user 'huckfinne' 
-- Password will be: admin123

INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_reviewer, is_active) 
VALUES (
    'huckfinne', 
    'huckfinne@toeqbank.com', 
    '$2a$12$LQv3c1yqBwEHXwBH9qcwCOgH5GXaC4Ua5J4KLHpWl8YjM3KsI8.NG', -- bcrypt hash of 'admin123'
    'Huck', 
    'Finne', 
    true, 
    true, 
    true
) 
ON CONFLICT (username) DO UPDATE SET 
    is_admin = true, 
    is_reviewer = true,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;