const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// DigitalOcean Spaces configuration
const spacesConfig = {
  endpoint: 'https://lon1.digitaloceanspaces.com',
  region: 'lon1',
  credentials: {
    accessKeyId: 'DO801KFGEYGTMRLV7B87',
    secretAccessKey: '4F8NAeKgwta0bwzAiYUNra9XWoE6k7gCmTBunPAcoG0'
  },
  forcePathStyle: false,
};

const s3Client = new S3Client(spacesConfig);
const BUCKET_NAME = 'toeqbank-images';
const SOURCE_DIR = '/Users/huckfinne/Python/Aksanio/TOE Images Upwork';

async function uploadFile(filePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = 'image/jpeg';
    
    // Generate a filename similar to your app's naming convention
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const spacesFileName = `toe_${uniqueSuffix}.jpg`;
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: spacesFileName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read'
    };

    console.log(`Uploading ${fileName} as ${spacesFileName}...`);
    
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    const publicUrl = `https://${BUCKET_NAME}.lon1.digitaloceanspaces.com/${spacesFileName}`;
    console.log(`✅ Uploaded: ${publicUrl}`);
    
    return {
      originalName: fileName,
      spacesFileName: spacesFileName,
      url: publicUrl,
      size: fileBuffer.length
    };
    
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    return null;
  }
}

async function uploadAllImages() {
  try {
    console.log('🚀 Starting upload of TOE images to Spaces...\n');
    
    const files = fs.readdirSync(SOURCE_DIR).filter(file => 
      file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')
    );
    
    console.log(`Found ${files.length} image files to upload:\n`);
    
    const results = [];
    for (const file of files) {
      const filePath = path.join(SOURCE_DIR, file);
      const result = await uploadFile(filePath, file);
      if (result) {
        results.push(result);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n🎉 Upload complete! ${results.length}/${files.length} files uploaded successfully.`);
    console.log('\nUploaded files:');
    results.forEach(result => {
      console.log(`- ${result.originalName} → ${result.url}`);
    });
    
    // Save results for database insertion later
    fs.writeFileSync('uploaded_images.json', JSON.stringify(results, null, 2));
    console.log('\n📝 Upload results saved to uploaded_images.json');
    
  } catch (error) {
    console.error('💥 Upload failed:', error);
  }
}

uploadAllImages();