require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { specs, swaggerUi } = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const xpRoutes = require('./routes/xp.routes');
const referralRoutes = require('./routes/referral.routes');
const questRoutes = require('./routes/quest.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const adminRoutes = require('./routes/admin.routes');

// Import workers
const leaderboardWorker = require('./workers/leaderboard.worker');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(logger.requestLogger);

// Rate limiting for auth routes (more permissive in development)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests default
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Health check / Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Nuvia Finance API is running',
    version: '1.0.0',
    docs: '/api-docs',
    timestamp: new Date()
  });
});

// Swagger API Documentation
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Nuvia Finance API Docs',
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  const workerStatus = leaderboardWorker.getStatus();
  
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    workers: workerStatus
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/xp', xpRoutes);  // Mount XP routes at /api/xp
app.use('/api/events', xpRoutes);  // Also mount at /api/events for event submission
app.use('/api/referral', referralRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/waitlist', waitlistRoutes); // Keep for backward compatibility
app.use('/api/admin', adminRoutes); // Admin routes

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Start workers
  leaderboardWorker.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  leaderboardWorker.stop();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = app;

