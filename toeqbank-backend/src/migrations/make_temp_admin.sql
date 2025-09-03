-- Make tempAdminFix user an admin
UPDATE users SET is_admin = TRUE, is_reviewer = TRUE WHERE username = 'tempAdminFix';