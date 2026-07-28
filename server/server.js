// Force Web Crypto API as global — required for MongoDB SASL authentication on Railway/Alpine
const { webcrypto } = require('crypto');
globalThis.crypto = webcrypto;
global.crypto = webcrypto;
console.log('🔐 Node version:', process.version);
console.log('🔐 crypto.subtle available:', typeof globalThis.crypto.subtle !== 'undefined');
console.log('🔐 MONGO_URI set:', !!process.env.MONGO_URI);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Railway)
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('A user connected via WebSocket', socket.id);
  
  socket.on('join_user_room', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id);
  });
});

// Security middleware
// Disable Helmet's cross-origin policies that block API access via Vite proxy
app.use(
  helmet({
    crossOriginResourcePolicy: false,   // allows cross-origin API responses
    crossOriginOpenerPolicy: false,     // needed for Vite dev proxy
    contentSecurityPolicy: false,       // CSP handled by frontend
  })
);

// CORS — allow localhost in dev, use CLIENT_URL in production
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow any localhost and any Vercel/Netlify/Render deployment
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.netlify\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin) ||
        /\.up\.railway\.app$/.test(origin)
      ) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running 🚀', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
const { startReminderJob } = require('./reminderJob');
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startReminderJob(io);
});
