# DigitalOcean Spaces Setup Instructions

## 1. Create a DigitalOcean Spaces Bucket

1. **Log into DigitalOcean Dashboard**
2. **Go to Spaces Object Storage** (left sidebar)
3. **Create a Space**:
   - Name: `toeqbank-images` (or your preferred name)
   - Region: `NYC3` (or your preferred region)
   - Enable CDN: **Yes** (recommended for faster image loading)
   - Restrict File Listing: **No** (we need public read access for images)

## 2. Create API Keys

1. **Go to API** (left sidebar)
2. **Spaces Keys** tab
3. **Generate New Key**:
   - Name: `toeqbank-spaces-key`
   - Copy the **Access Key ID** and **Secret Access Key**

## 3. Update Environment Variables

### Backend (.env file):
```bash
# DigitalOcean Spaces Configuration
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=toeqbank-images
DO_SPACES_KEY=your_actual_access_key_here
DO_SPACES_SECRET=your_actual_secret_key_here
```

### DigitalOcean App Platform Environment Variables:
Add these in your app's environment variables:
- `DO_SPACES_ENDPOINT`: `https://nyc3.digitaloceanspaces.com`
- `DO_SPACES_REGION`: `nyc3`
- `DO_SPACES_BUCKET`: `toeqbank-images`
- `DO_SPACES_KEY`: `your_actual_access_key_here`
- `DO_SPACES_SECRET`: `your_actual_secret_key_here`

## 4. Test the Integration

1. **Deploy the updated code**
2. **Upload a test image** through your app
3. **Check that the image URL** starts with `https://toeqbank-images.nyc3.digitaloceanspaces.com/`
4. **Verify the image loads** correctly in your browser

## 5. CORS Configuration (if needed)

If you encounter CORS issues, add this configuration to your Space:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Benefits After Setup

✅ **Images survive deployments** - No more lost uploads!
✅ **Better performance** - CDN distribution
✅ **Scalable storage** - No local disk limits
✅ **Automatic backups** - DigitalOcean handles redundancy

## Fallback Behavior

- If Spaces is not configured, uploads will use local storage (current behavior)
- If Spaces upload fails, it falls back to local storage automatically
- Existing local images will continue to work normally

## Migration Notes

- Existing local images will continue to work
- New uploads will go to Spaces automatically
- You can migrate old images to Spaces later if needed