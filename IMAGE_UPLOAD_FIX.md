# Image Upload Fix

## Issue
Image upload was failing with a 500 error due to missing `source_url` column in the database.

## Solution Applied

1. **Added missing column to database:**
   ```sql
   ALTER TABLE images ADD COLUMN IF NOT EXISTS source_url TEXT;
   ```

2. **Enhanced error logging in the backend** to better diagnose issues:
   - Added detailed logging to image upload endpoint
   - Added error details to response for development mode

3. **Fixed image data structure** to include all required fields with proper defaults

## To Start the Application

1. **Make sure PostgreSQL is running**

2. **Start the backend server:**
   ```bash
   cd toeqbank/toeqbank-backend
   npm run dev
   ```
   
3. **Start the frontend server:**
   ```bash
   cd toeqbank/toeqbank-frontend
   npm start
   ```

## Testing Image Upload

1. Navigate to the Image Library or Create Question page
2. Click "Add Images" or similar button
3. Select an image file (JPEG, PNG, GIF, WebP) or video (MP4, WebM)
4. Add optional description and tags
5. Click Upload

The backend will now properly handle the upload and store the image in the database.

## Troubleshooting

If you still get errors:

1. Check the backend console for detailed error messages
2. Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
3. Check the uploads directory exists: `ls toeqbank/toeqbank-backend/uploads/images/`
4. Make sure both servers are running on the correct ports (backend: 3001, frontend: 3000)