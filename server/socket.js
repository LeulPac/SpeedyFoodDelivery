/**
 * socket.js — Singleton holder for the Socket.io instance.
 * 
 * server.js calls `init(httpServer)` once at startup.
 * Controllers call `getIo()` to emit events — no circular imports.
 */

let _io = null;

const init = (httpServer) => {
  const { Server } = require('socket.io');
  
  const customOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  _io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (customOrigins.includes('*') || customOrigins.includes(origin)) return callback(null, true);
        if (/^http:\/\/localhost:\d+$/i.test(origin)) return callback(null, true);
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
        return callback(new Error(`Socket CORS blocked: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  return _io;
};

const getIo = () => {
  if (!_io) throw new Error('Socket.io not initialized! Call init(httpServer) first.');
  return _io;
};

module.exports = { init, getIo };
