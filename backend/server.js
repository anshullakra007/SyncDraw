require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1); // Trust Render's reverse proxy for wss:// support
app.use(cors());

// Parse allowed origins from environment (comma-separated) or use sensible defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sync-draw-eight.vercel.app,http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000').split(',').map(s => s.trim());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or localhost/dev environments
      if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('CORS: origin not allowed'));
      }
    },
    methods: ['GET', 'POST']
  }
});

// Configure Google OAuth Client if GOOGLE_CLIENT_ID is provided
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
let googleClient = null;
if (!GOOGLE_CLIENT_ID) {
  console.warn('[AUTH WARNING] GOOGLE_CLIENT_ID environment variable is not set. Running in Demo/Guest authentication mode.');
} else {
  googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
}

// Helper to generate consistent avatar colors for guest cursors
const getCursorColor = (id) => {
  const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 🛡️ The Gatekeeper: Verify OAuth JWT or allow Guest/Demo token on Handshake
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const roomId = socket.handshake.auth.roomId || 'default';
    socket.roomId = String(roomId).trim() || 'default';
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Support Guest/Demo Mode if token is a guest token or if Google OAuth is not configured
    if (token === 'guest' || String(token).startsWith('guest-') || !googleClient) {
      const shortId = socket.id.slice(0, 4);
      socket.user = {
        name: `Guest (${shortId})`,
        email: `guest-${shortId}@syncdraw.dev`,
        picture: '',
        googleId: `guest-${socket.id}`,
        color: getCursorColor(socket.id)
      };
      console.log(`[AUTH] Guest user connected: ${socket.user.name} to room [${socket.roomId}]`);
      return next();
    }

    // Mathematically verify the token against Google's public keys
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    // Attach user information to the socket for the session
    socket.user = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      googleId: payload.sub,
      color: getCursorColor(payload.sub || socket.id)
    };

    console.log(`[AUTH] User connected: ${socket.user.name} (${socket.user.email}) to room [${socket.roomId}]`);
    next();
  } catch (error) {
    console.error('[AUTH ERROR] Invalid token:', error.message);
    next(new Error("Authentication error: Invalid or expired token"));
  }
});

// 🌐 Room state storage: roomId -> { strokeHistory, title, users: Map }
const rooms = new Map();
const MAX_STROKES = 50000;

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      strokeHistory: [],
      title: 'Untitled Board',
      users: new Map()
    });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  console.log(`[CONNECT] Socket established for: ${socket.user.name} [ID: ${socket.id}, Room: ${socket.roomId}]`);

  socket.join(socket.roomId);
  const room = getRoom(socket.roomId);
  room.users.set(socket.id, socket.user);

  // Broadcast updated room user count and active user list
  const broadcastRoomStats = () => {
    io.to(socket.roomId).emit('user-count', room.users.size);
    io.to(socket.roomId).emit('room-users', Array.from(room.users.values()));
  };
  broadcastRoomStats();

  // Step 1: Send the initial canvas state (history and board title) to newly connected client
  socket.emit('init-canvas', {
    strokes: room.strokeHistory,
    title: room.title
  });

  // Step 2: Listen for stroke and broadcast to room
  socket.on('draw-stroke', (data) => {
    if (!data) return;
    if (!data.id) {
      data.id = Math.random().toString(36).substring(2, 11);
    }
    room.strokeHistory.push(data);
    if (room.strokeHistory.length > MAX_STROKES) {
      room.strokeHistory.shift();
    }
    socket.to(socket.roomId).emit('draw-stroke', data);
  });

  // Step 3: Handle collaborative stroke undo
  socket.on('undo-stroke', (data) => {
    if (!data || !data.id) return;
    const index = room.strokeHistory.findIndex(s => s.id === data.id);
    if (index !== -1) {
      room.strokeHistory.splice(index, 1);
      socket.to(socket.roomId).emit('undo-stroke', { id: data.id });
    }
  });

  // Step 4: Handle live collaborative cursor movement
  socket.on('cursor-move', (data) => {
    if (!data) return;
    socket.to(socket.roomId).emit('cursor-move', {
      socketId: socket.id,
      user: socket.user,
      x: data.x,
      y: data.y
    });
  });

  // Step 5: Handle board title updates
  socket.on('update-board-title', (data) => {
    if (data && typeof data.title === 'string' && data.title.trim()) {
      room.title = data.title.trim();
      io.to(socket.roomId).emit('update-board-title', room.title);
    }
  });

  // Step 6: Handle board clear
  socket.on('clear-canvas', () => {
    room.strokeHistory.length = 0;
    socket.to(socket.roomId).emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] User disconnected: ${socket.user.name} [ID: ${socket.id}, Room: ${socket.roomId}]`);
    room.users.delete(socket.id);
    socket.to(socket.roomId).emit('cursor-leave', { socketId: socket.id });
    setTimeout(() => {
      broadcastRoomStats();
      if (room.users.size === 0 && room.strokeHistory.length === 0 && room.title === 'Untitled Board') {
        rooms.delete(socket.roomId);
      }
    }, 100);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 SyncDraw Node.js Server listening on port ${PORT}`);
  console.log(`🔒 WebSocket Connections ready (OAuth2 & Demo Guest Mode supported).`);
});
