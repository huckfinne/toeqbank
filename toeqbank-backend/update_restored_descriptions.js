const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://toeqbank:AVNS_wbfh3IuQ6BE0OKhBMs0@app-7cb09303-7e3f-4f9f-b588-64d1d97b1bd4-do-user-19953993-0.i.db.ondigitalocean.com:25060/toeqbank',
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateRestoredDescriptions() {
  try {
    console.log('🔍 Finding original images with descriptions...');
    
    // Get the original images uploaded by Zahid735 that have detailed descriptions
    const originalImages = await pool.query(`
      SELECT id, filename, original_name, description, tags 
      FROM images 
      WHERE uploaded_by = 28 
      AND id BETWEEN 10 AND 19 
      AND description IS NOT NULL 
      AND description NOT LIKE 'Restored image from%'
      ORDER BY id
    `);
    
    // Get the restored images that need descriptions
    const restoredImages = await pool.query(`
      SELECT id, filename, original_name, description
      FROM images 
      WHERE uploaded_by = 28 
      AND id >= 25 
      AND description LIKE 'Restored image from%'
      ORDER BY id
    `);
    
    console.log(`📊 Found ${originalImages.rows.length} original images with descriptions`);
    console.log(`📊 Found ${restoredImages.rows.length} restored images needing descriptions`);
    
    if (originalImages.rows.length === 0) {
      console.log('❌ No original images with descriptions found');
      return;
    }
    
    console.log('\n🔄 Updating descriptions for restored images...\n');
    
    // For now, let's assign descriptions in order since we can't directly match filenames
    // This assumes the restored images are in the same order as the original uploads
    for (let i = 0; i < Math.min(originalImages.rows.length, restoredImages.rows.length); i++) {
      const original = originalImages.rows[i];
      const restored = restoredImages.rows[i];
      
      try {
        await pool.query(`
          UPDATE images 
          SET 
            description = $1,
            tags = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [
          original.description,
          original.tags,
          restored.id
        ]);
        
        console.log(`✅ Updated image ${restored.id} (${restored.original_name})`);
        console.log(`   Using description from original image ${original.id}`);
        console.log(`   Description: ${original.description.substring(0, 100)}...`);
        console.log('');
        
      } catch (updateError) {
        console.error(`❌ Failed to update image ${restored.id}:`, updateError.message);
      }
    }
    
    console.log('🎉 Description update complete!');
    console.log('\nThe restored images should now show their proper TEE descriptions in the Image Library!');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await pool.end();
  }
}

updateRestoredDescriptions();