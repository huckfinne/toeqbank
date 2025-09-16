const { Pool } = require('pg');
const fs = require('fs');

// Database configuration (same as your .env)
const pool = new Pool({
  connectionString: 'postgresql://toeqbank:AVNS_wbfh3IuQ6BE0OKhBMs0@app-7cb09303-7e3f-4f9f-b588-64d1d97b1bd4-do-user-19953993-0.i.db.ondigitalocean.com:25060/toeqbank',
  ssl: {
    rejectUnauthorized: false // Relaxed SSL for DO managed database
  }
});

async function addImagesToDatabase() {
  try {
    console.log('📥 Reading uploaded images data...');
    const imagesData = JSON.parse(fs.readFileSync('uploaded_images.json', 'utf8'));
    
    console.log('🔍 Finding Zahid735 user ID...');
    const userResult = await pool.query(
      "SELECT id FROM users WHERE username = 'Zahid735'"
    );
    
    if (userResult.rows.length === 0) {
      console.error('❌ Zahid735 user not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found Zahid735 with ID: ${userId}`);
    
    console.log('\n🚀 Adding images to database...\n');
    
    for (const image of imagesData) {
      const imageData = {
        filename: image.spacesFileName,
        original_name: image.originalName,
        file_path: image.url, // Store the Spaces URL
        file_size: image.size,
        mime_type: 'image/jpeg',
        image_type: 'still',
        description: `Restored image from Upwork folder - ${image.originalName}`,
        tags: ['restored', 'upwork', 'zahid735'],
        license: 'user-contributed',
        uploaded_by: userId
      };
      
      try {
        const result = await pool.query(`
          INSERT INTO images (
            filename, original_name, file_path, file_size, mime_type, 
            image_type, description, tags, license, uploaded_by,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id, filename
        `, [
          imageData.filename,
          imageData.original_name,
          imageData.file_path,
          imageData.file_size,
          imageData.mime_type,
          imageData.image_type,
          imageData.description,
          imageData.tags,
          imageData.license,
          imageData.uploaded_by
        ]);
        
        console.log(`✅ Added: ${image.originalName} → ID: ${result.rows[0].id}`);
        console.log(`   URL: ${image.url}`);
        
      } catch (insertError) {
        console.error(`❌ Failed to add ${image.originalName}:`, insertError.message);
      }
    }
    
    console.log('\n🎉 Database update complete!');
    console.log('\nThe restored images should now appear in your Image Library!');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await pool.end();
  }
}

addImagesToDatabase();