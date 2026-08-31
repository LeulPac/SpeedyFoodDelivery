const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const socketManager = require('./socket');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);

// Initialize socket.io via singleton (no circular deps)
const io = socketManager.init(server);

// ---- CORS ----
// In production, set ALLOWED_ORIGINS in Render env vars as a comma-separated list
// of Vercel URLs, e.g.: https://customer.vercel.app,https://admin.vercel.app
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .concat([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Socket.io real-time events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Server entry
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app };
