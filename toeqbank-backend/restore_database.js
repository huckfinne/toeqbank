#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Handle Digital Ocean managed database SSL (relaxed verification for now)
const sslConfig = {
  ssl: {
    rejectUnauthorized: false // Required for DO managed databases
  }
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...sslConfig
});

async function restoreDatabase(backupTimestamp) {
  if (!backupTimestamp) {
    console.log('❌ Please provide backup timestamp');
    console.log('Usage: node restore_database.js 2025-09-01T18-10-00-000Z');
    console.log('\nAvailable backups:');
    const backupDir = './database_backups';
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      const summaries = files.filter(f => f.startsWith('backup_summary_'));
      summaries.forEach(summary => {
        const timestamp = summary.replace('backup_summary_', '').replace('.json', '');
        const content = JSON.parse(fs.readFileSync(path.join(backupDir, summary), 'utf8'));
        console.log(`  ${timestamp} - ${Object.values(content.tables).reduce((a, b) => a + b, 0)} total records`);
      });
    }
    return;
  }
  
  const client = await pool.connect();
  const backupDir = './database_backups';
  
  try {
    console.log(`🔄 Starting database restore from ${backupTimestamp}...`);
    
    // Read backup files
    const questionsFile = path.join(backupDir, `questions_${backupTimestamp}.json`);
    const usersFile = path.join(backupDir, `users_${backupTimestamp}.json`);
    const imagesFile = path.join(backupDir, `images_${backupTimestamp}.json`);
    const questionImagesFile = path.join(backupDir, `question_images_${backupTimestamp}.json`);
    const imageDescFile = path.join(backupDir, `image_descriptions_${backupTimestamp}.json`);
    
    // Verify files exist
    const files = [questionsFile, usersFile, imagesFile, questionImagesFile, imageDescFile];
    for (const file of files) {
      if (!fs.existsSync(file)) {
        throw new Error(`Backup file not found: ${file}`);
      }
    }
    
    console.log('⚠️  WARNING: This will DELETE ALL current data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Clear existing data
    await client.query('TRUNCATE question_images, image_descriptions, questions, images CASCADE');
    console.log('🗑️  Cleared existing data');
    
    // Restore questions
    const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf8'));
    for (const q of questions) {
      await client.query(`
        INSERT INTO questions (id, question_number, question, choice_a, choice_b, choice_c, choice_d, choice_e, choice_f, choice_g, correct_answer, explanation, source_folder, review_status, review_notes, reviewed_by, reviewed_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [q.id, q.question_number, q.question, q.choice_a, q.choice_b, q.choice_c, q.choice_d, q.choice_e, q.choice_f, q.choice_g, q.correct_answer, q.explanation, q.source_folder, q.review_status, q.review_notes, q.reviewed_by, q.reviewed_at, q.created_at, q.updated_at]);
    }
    console.log(`✅ Restored ${questions.length} questions`);
    
    // Restore images
    const images = JSON.parse(fs.readFileSync(imagesFile, 'utf8'));
    for (const img of images) {
      await client.query(`
        INSERT INTO images (id, filename, original_name, file_path, file_size, mime_type, image_type, width, height, duration_seconds, description, tags, license, license_details, source_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [img.id, img.filename, img.original_name, img.file_path, img.file_size, img.mime_type, img.image_type, img.width, img.height, img.duration_seconds, img.description, img.tags, img.license, img.license_details, img.source_url, img.created_at, img.updated_at]);
    }
    console.log(`✅ Restored ${images.length} images`);
    
    // Restore question_images
    const questionImages = JSON.parse(fs.readFileSync(questionImagesFile, 'utf8'));
    for (const qi of questionImages) {
      await client.query(`
        INSERT INTO question_images (id, question_id, image_id, display_order, usage_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [qi.id, qi.question_id, qi.image_id, qi.display_order, qi.usage_type, qi.created_at]);
    }
    console.log(`✅ Restored ${questionImages.length} question-image relationships`);
    
    // Restore image_descriptions
    const imageDescriptions = JSON.parse(fs.readFileSync(imageDescFile, 'utf8'));
    for (const desc of imageDescriptions) {
      await client.query(`
        INSERT INTO image_descriptions (id, question_id, description, usage_type, modality, echo_view, image_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [desc.id, desc.question_id, desc.description, desc.usage_type, desc.modality, desc.echo_view, desc.image_type, desc.created_at, desc.updated_at]);
    }
    console.log(`✅ Restored ${imageDescriptions.length} image descriptions`);
    
    // Update sequences
    await client.query("SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions))");
    await client.query("SELECT setval('images_id_seq', (SELECT MAX(id) FROM images))");
    await client.query("SELECT setval('question_images_id_seq', (SELECT MAX(id) FROM question_images))");
    await client.query("SELECT setval('image_descriptions_id_seq', (SELECT MAX(id) FROM image_descriptions))");
    
    console.log('🎉 Database restored successfully!');
    
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  const timestamp = process.argv[2];
  restoreDatabase(timestamp);
}

module.exports = { restoreDatabase };