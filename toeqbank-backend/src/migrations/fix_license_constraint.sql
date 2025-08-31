-- Fix the license constraint to include cc-by-sa-3.0
ALTER TABLE images DROP CONSTRAINT IF EXISTS images_license_check;

ALTER TABLE images ADD CONSTRAINT images_license_check 
CHECK (license IN (
  'mit', 
  'apache-2.0', 
  'gpl-3.0', 
  'bsd-3-clause', 
  'cc0-1.0', 
  'cc-by-4.0', 
  'cc-by-sa-3.0',  -- Added this missing license
  'cc-by-sa-4.0', 
  'cc-by-nc-4.0', 
  'cc-by-nc-sa-4.0', 
  'copyright-borrowed', 
  'user-contributed'
));