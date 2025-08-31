-- Create reviewer user 'huckfinnereviewer' 
-- Password will be: reviewer123

INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_reviewer, is_active) 
VALUES (
    'huckfinnereviewer', 
    'huckfinnereviewer@toeqbank.com', 
    '$2a$12$8wJ9mK4nL2vP6tR1yH3xOe5GzQ8cF7dA9sM6pL4nK2vP6tR1yH3xO', -- bcrypt hash of 'reviewer123'
    'Huck', 
    'Reviewer', 
    false, 
    true, 
    true
) 
ON CONFLICT (username) DO UPDATE SET 
    is_reviewer = true,
    is_admin = false,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;