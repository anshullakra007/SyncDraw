import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token, roomId, callbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [roomUsers, setRoomUsers] = useState([]);
  const socketRef = useRef(null);

  const callbacksRef = useRef(callbacks);
  
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!token) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || (
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080'
        : 'https://syncdraw-backend-baq7.onrender.com'
    );

    // Establish WebSocket connection with robust reconnection logic
    const socket = io(backendUrl, {
      auth: { token, roomId: roomId || 'default' },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`❌ Disconnected from server. Reason: ${reason}`);
      setIsConnected(false);
    });

    socket.on('user-count', (n) => setUserCount(n));
    socket.on('room-users', (users) => setRoomUsers(users || []));
    
    // Attach dynamically passed callbacks using refs to prevent render loops
    socket.on('init-canvas', (payload) => {
      const strokes = Array.isArray(payload) ? payload : (payload?.strokes || []);
      const title = !Array.isArray(payload) && payload?.title ? payload.title : null;
      callbacksRef.current.onInitCanvas?.({ strokes, title });
    });
    socket.on('draw-stroke', (s) => callbacksRef.current.onDrawStroke?.(s));
    socket.on('undo-stroke', (data) => callbacksRef.current.onUndoStroke?.(data));
    socket.on('clear-canvas', () => callbacksRef.current.onClearCanvas?.());
    socket.on('cursor-move', (c) => callbacksRef.current.onCursorMove?.(c));
    socket.on('cursor-leave', (c) => callbacksRef.current.onCursorLeave?.(c));
    socket.on('update-board-title', (t) => callbacksRef.current.onUpdateBoardTitle?.(t));
    socket.on('connect_error', (e) => callbacksRef.current.onError?.(e));

    return () => {
      socket.disconnect();
    };
  }, [token, roomId]);

  const emitStroke = useCallback((data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('draw-stroke', data);
    }
  }, []);

  const emitUndoStroke = useCallback((data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('undo-stroke', data);
    }
  }, []);

  const emitClear = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('clear-canvas');
    }
  }, []);

  const emitCursorMove = useCallback((data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-move', data);
    }
  }, []);

  const emitTitleChange = useCallback((title) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update-board-title', { title });
    }
  }, []);

  return {
    isConnected,
    userCount,
    roomUsers,
    emitStroke,
    emitUndoStroke,
    emitClear,
    emitCursorMove,
    emitTitleChange
  };
}

