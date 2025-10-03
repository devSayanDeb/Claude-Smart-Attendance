const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get client IP
app.get('/api/get-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
  res.send(ip);
});

// Session management (simplified for now)
app.post('/api/sessions', (req, res) => {
  try {
    const sessionId = require('uuid').v4();
    const session = {
      id: sessionId,
      ...req.body,
      createdAt: new Date(),
      status: 'active'
    };
    
    logger.info('Session created:', { sessionId, className: req.body.className });
    
    // Emit to connected clients
    io.emit('session-created', { sessionId, session });
    
    res.json({ 
      success: true, 
      sessionId, 
      session: {
        id: session.id,
        className: session.className,
        period: session.period,
        roomNumber: session.roomNumber,
        status: session.status,
        startTime: session.createdAt
      }
    });
  } catch (error) {
    logger.error('Session creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sessions
app.get('/api/sessions', (req, res) => {
  try {
    // For now, return empty array - will be implemented with database
    res.json([]);
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Simple attendance submission
app.post('/api/attendance/submit', (req, res) => {
  try {
    const attendanceId = require('uuid').v4();
    const {
      rollNumber,
      otp,
      sessionId,
      deviceFingerprint,
      ipAddress,
      browserFingerprint
    } = req.body;
    
    // Basic validation
    if (!rollNumber || !otp || !sessionId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const attendance = {
      id: attendanceId,
      rollNumber,
      sessionId,
      timestamp: new Date(),
      securityScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100 for demo
      status: 'present',
      deviceFingerprint: deviceFingerprint?.substring(0, 50) + '...', // Truncate for logs
      ipAddress
    };
    
    logger.info('Attendance submitted:', {
      attendanceId,
      rollNumber,
      sessionId,
      securityScore: attendance.securityScore
    });
    
    // Emit real-time update
    io.to(`session-${sessionId}`).emit('attendance-update', {
      type: 'new-attendance',
      attendance
    });
    
    res.json({ 
      success: true, 
      message: 'Attendance marked successfully',
      attendanceId,
      securityScore: attendance.securityScore,
      timestamp: attendance.timestamp
    });
  } catch (error) {
    logger.error('Attendance submission error:', error);
    res.status(500).json({ message: error.message });
  }
});

// OTP generation (demo)
app.post('/api/attendance/request-otp', (req, res) => {
  try {
    const { sessionId, studentId } = req.body;
    
    if (!sessionId || !studentId) {
      return res.status(400).json({ message: 'Session ID and Student ID required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 90000); // 90 seconds
    
    logger.info('OTP generated:', { studentId, sessionId, otp });
    
    res.json({ otp, expiresAt });
  } catch (error) {
    logger.error('OTP request error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    logger.info(`Client ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = { app, server, logger };