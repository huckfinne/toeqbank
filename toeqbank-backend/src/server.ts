import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { initializeDatabase, getPoolStatus } from './models/database';
import questionRoutes from './routes/questions';
import authRoutes from './routes/auth';
import imageRoutes from './routes/images';
import imageDescriptionRoutes from './routes/imageDescriptions';
import questionMetadataRoutes from './routes/questionMetadata';
import metadataRoutes from './routes/metadata';
import examRoutes from './routes/exams';
import debugRoutes from './routes/debug';
import savedExplanationsRoutes from './routes/savedExplanations';

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
app.use('/api/debug', debugRoutes);
app.use('/api/saved-explanations', savedExplanationsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check endpoint
app.get('/health/database', async (req, res) => {
  try {
    const status = getPoolStatus();
    res.json({
      status: status.isHealthy ? 'healthy' : 'unhealthy',
      details: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('⚠️  Database initialization failed, but starting server anyway:', (error as Error).message);
    console.log('🔄 Server will retry database connections on each request');
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API base URL: http://localhost:${PORT}/api`);
  });
};

startServer();