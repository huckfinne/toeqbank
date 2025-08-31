import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { initializeDatabase } from './models/database';
import questionRoutes from './routes/questions';
import authRoutes from './routes/auth';
import imageRoutes from './routes/images';
import imageDescriptionRoutes from './routes/imageDescriptions';
import questionMetadataRoutes from './routes/questionMetadata';
import metadataRoutes from './routes/metadata';
import examRoutes from './routes/exams';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/image-descriptions', imageDescriptionRoutes);
app.use('/api/question-metadata', questionMetadataRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/exams', examRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();