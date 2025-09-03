-- Create huckfinne as admin user
-- Use INSERT ... ON CONFLICT to handle existing user
INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_reviewer, is_active)
VALUES (
  'huckfinne', 
  'huck@aksan.io', 
  '$2a$12$3x6lt3KxAwpJm861w/F08uFabvfS4cCphRmogceAgfKlDBh8uHhDS',  -- bcrypt hash of 'pFjqVjrAhUie25y'
  'Huckelberry', 
  'Finne', 
  TRUE, 
  TRUE, 
  TRUE
)
ON CONFLICT (username) DO UPDATE SET
  is_admin = TRUE,
  is_reviewer = TRUE,
  is_active = TRUE;