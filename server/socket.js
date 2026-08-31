/**
 * socket.js — Singleton holder for the Socket.io instance.
 * 
 * server.js calls `init(httpServer)` once at startup.
 * Controllers call `getIo()` to emit events — no circular imports.
 */

let _io = null;

const init = (httpServer) => {
  const { Server } = require('socket.io');
  // Reuse ALLOWED_ORIGINS from env for Socket.io CORS as well
  const origins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .concat([
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ]);
  _io = new Server(httpServer, {
    cors: {
      origin: origins.length > 0 ? origins : '*',
      methods: ['GET', 'POST'],
    },
  });
  return _io;
};

const getIo = () => {
  if (!_io) throw new Error('Socket.io not initialized! Call init(httpServer) first.');
  return _io;
};

module.exports = { init, getIo };
