require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');

const app = express();
app.use(cors());

// Parse allowed origins from environment (comma-separated) or use sensible defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sync-draw-eight.vercel.app,http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('CORS: origin not allowed'));
      }
    },
    methods: ['GET', 'POST']
  }
});

// Enforce Google Client ID
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error('FATAL ERROR: GOOGLE_CLIENT_ID environment variable is missing.');
  process.exit(1);
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🛡️ The Gatekeeper: Verify Google JWT on Handshake
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Mathematically verify the token against Google's public keys
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    // Attach user information to the socket for the session
    socket.user = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      googleId: payload.sub
    };

    console.log(`[AUTH] User connected: ${socket.user.name} (${socket.user.email})`);
    next();
  } catch (error) {
    console.error('[AUTH ERROR] Invalid token:', error.message);
    next(new Error("Authentication error: Invalid or expired token"));
  }
});

// 🌐 Handle Real-time Drawing Events
const strokeHistory = [];
const MAX_STROKES = 50000;

io.on('connection', (socket) => {
  console.log(`[CONNECT] Socket established for: ${socket.user.name} [ID: ${socket.id}]`);

  // Broadcast updated user count
  const broadcastCount = () => io.emit('user-count', io.engine.clientsCount);
  broadcastCount();

  // Step 1: Send the stroke history to newly connected client
  socket.emit('init-canvas', strokeHistory);

  // Step 2: Listen for stroke and broadcast
  socket.on('draw-stroke', (data) => {
    strokeHistory.push(data);
    if (strokeHistory.length > MAX_STROKES) {
      strokeHistory.shift();
    }
    socket.broadcast.emit('draw-stroke', data);
  });

  // Handle board clear
  socket.on('clear-canvas', () => {
    strokeHistory.length = 0;
    socket.broadcast.emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] User disconnected: ${socket.user.name} [ID: ${socket.id}]`);
    setTimeout(() => io.emit('user-count', io.engine.clientsCount), 100);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 SyncDraw Node.js Server listening on port ${PORT}`);
  console.log(`🔒 WebSocket Connections secured with Google OAuth2.`);
});
