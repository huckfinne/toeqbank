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

async function backupDatabase() {
  const client = await pool.connect();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './database_backups';
  
  try {
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    console.log('🔄 Starting database backup...');
    
    // Backup questions
    const questions = await client.query('SELECT * FROM questions ORDER BY id');
    const questionsFile = path.join(backupDir, `questions_${timestamp}.json`);
    fs.writeFileSync(questionsFile, JSON.stringify(questions.rows, null, 2));
    console.log(`✅ Questions backed up: ${questions.rows.length} records -> ${questionsFile}`);
    
    // Backup users
    const users = await client.query('SELECT id, username, email, first_name, last_name, is_admin, is_reviewer, is_active, created_at FROM users ORDER BY id');
    const usersFile = path.join(backupDir, `users_${timestamp}.json`);
    fs.writeFileSync(usersFile, JSON.stringify(users.rows, null, 2));
    console.log(`✅ Users backed up: ${users.rows.length} records -> ${usersFile}`);
    
    // Backup images
    const images = await client.query('SELECT * FROM images ORDER BY id');
    const imagesFile = path.join(backupDir, `images_${timestamp}.json`);
    fs.writeFileSync(imagesFile, JSON.stringify(images.rows, null, 2));
    console.log(`✅ Images backed up: ${images.rows.length} records -> ${imagesFile}`);
    
    // Backup question_images relationships
    const questionImages = await client.query('SELECT * FROM question_images ORDER BY id');
    const questionImagesFile = path.join(backupDir, `question_images_${timestamp}.json`);
    fs.writeFileSync(questionImagesFile, JSON.stringify(questionImages.rows, null, 2));
    console.log(`✅ Question-Image relationships backed up: ${questionImages.rows.length} records -> ${questionImagesFile}`);
    
    // Backup image_descriptions
    const imageDescriptions = await client.query('SELECT * FROM image_descriptions ORDER BY id');
    const imageDescFile = path.join(backupDir, `image_descriptions_${timestamp}.json`);
    fs.writeFileSync(imageDescFile, JSON.stringify(imageDescriptions.rows, null, 2));
    console.log(`✅ Image descriptions backed up: ${imageDescriptions.rows.length} records -> ${imageDescFile}`);
    
    // Create a summary file
    const summary = {
      backup_date: new Date().toISOString(),
      database_url: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      tables: {
        questions: questions.rows.length,
        users: users.rows.length,
        images: images.rows.length,
        question_images: questionImages.rows.length,
        image_descriptions: imageDescriptions.rows.length
      }
    };
    
    const summaryFile = path.join(backupDir, `backup_summary_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('🎉 Backup completed successfully!');
    console.log(`📁 Backup location: ${path.resolve(backupDir)}`);
    console.log(`📊 Summary: ${JSON.stringify(summary.tables, null, 2)}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };