const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const itemRoutes = require('./routes/itemRoutes');
const repairRequestRoutes = require('./routes/repairRequestRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const repairJobRoutes = require('./routes/repairJobRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { donationRoutes, partsRoutes, warrantyRoutes, warrantyClaimsRoutes,
  reviewRoutes, disputeRoutes, notificationRoutes } = require('./routes/additionalRoutes');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  }));
}

// General rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: config.env });
});

// API v1 routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/technicians`, technicianRoutes);
app.use(`${API_PREFIX}/organizations`, organizationRoutes);
app.use(`${API_PREFIX}`, categoryRoutes); // /categories and /skills
app.use(`${API_PREFIX}/items`, itemRoutes);
app.use(`${API_PREFIX}/repair-requests`, repairRequestRoutes);
app.use(`${API_PREFIX}/quotations`, quotationRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/repair-jobs`, repairJobRoutes);
app.use(`${API_PREFIX}/donations`, donationRoutes);
app.use(`${API_PREFIX}/parts`, partsRoutes);
app.use(`${API_PREFIX}/warranties`, warrantyRoutes);
app.use(`${API_PREFIX}/warranty-claims`, warrantyClaimsRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/disputes`, disputeRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
