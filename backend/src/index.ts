import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './database/connection';
import mongoose from 'mongoose';

// Import routes
import apiRoutes from './routes/api';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('🔧 Environment check:');
console.log('Current working directory:', process.cwd());
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
console.log('PORT:', process.env.PORT);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://listless-frontend-production.up.railway.app'] // Specific frontend domain in production
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check with more detailed information
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Listless backend is running!',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      openai: !!process.env.OPENAI_API_KEY,
      mongodb: !!process.env.MONGODB_URI,
      frontendUrl: process.env.FRONTEND_URL || 'not set'
    },
    memory: process.memoryUsage(),
    database: {
      state: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: process.env.MONGODB_URI ? new URL(process.env.MONGODB_URI).hostname : 'not set'
    }
  };
  
  res.json(health);
});

// API Routes
app.use('/api', apiRoutes);

// Error handling with more details
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => { 
  res.status(404).json({ 
    success: false, 
    error: { 
      message: `Route not found: ${req.method} ${req.path}`,
      path: req.path,
      method: req.method
    } 
  }); 
});

// Start server with better error handling
async function startServer() {
  try {
    // Connect to database first
    await connectDatabase();
    console.log('✅ Database connected');

    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`🧠 AI Test: http://localhost:${PORT}/api/ai/process-task`);
      console.log(`📋 Tasks: http://localhost:${PORT}/api/tasks`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();