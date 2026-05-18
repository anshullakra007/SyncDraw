import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token, callbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const socketRef = useRef(null);

  const callbacksRef = useRef(callbacks);
  
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!token) return;

    // Establish WebSocket connection with robust reconnection logic
    const socket = io(import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://syncdraw-backend-baq7.onrender.com'), {
      auth: { token },
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
    
    // Attach dynamically passed callbacks using refs to prevent render loops
    socket.on('init-canvas', (s) => callbacksRef.current.onInitCanvas?.(s));
    socket.on('draw-stroke', (s) => callbacksRef.current.onDrawStroke?.(s));
    socket.on('clear-canvas', () => callbacksRef.current.onClearCanvas?.());
    socket.on('connect_error', (e) => callbacksRef.current.onError?.(e));

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const emitStroke = (data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('draw-stroke', data);
    }
  };

  const emitClear = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('clear-canvas');
    }
  };

  return { isConnected, userCount, emitStroke, emitClear };
}
