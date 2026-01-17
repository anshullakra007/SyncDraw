import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

// 🎨 Random color for this user
const USER_COLOR = '#' + Math.floor(Math.random() * 16777215).toString(16);

function App() {
  const canvasRef = useRef(null);
  const stompClientRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 1. Initialize Canvas
    const canvas = canvasRef.current;
    // Set canvas size to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    // 2. Connect to Java Backend
    const client = new Client({
      brokerURL: 'wss://syncdraw-backend.onrender.com/ws/websocket',
      onConnect: () => {
        console.log('✅ Connected to WebSocket');

        // Subscribe to incoming drawings from other users
        client.subscribe('/topic/canvas', (message) => {
          const data = JSON.parse(message.body);
          drawOnCanvas(data.x, data.y, data.prevX, data.prevY, data.color);
        });
      },
      onWebSocketError: (error) => {
        console.error('Error with websocket', error);
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    stompClientRef.current = client;

    // Prevent scrolling on mobile when touching the canvas
    const preventScroll = (e) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };
    
    document.body.addEventListener('touchstart', preventScroll, { passive: false });
    document.body.addEventListener('touchmove', preventScroll, { passive: false });

    // Cleanup on close
    return () => {
      client.deactivate();
      document.body.removeEventListener('touchstart', preventScroll);
      document.body.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // 🖌️ Helper: Draws a line on the canvas
  const drawOnCanvas = (x, y, prevX, prevY, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4; // Ensure line width is consistent
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
  };

  // 🖱️👆 Universal Helper: Get coordinates for both Mouse and Touch
  const getCoordinates = (event) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    // Check if it is a touch event
    if (event.touches && event.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }

    // Otherwise it is a mouse event
    return {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setPrevPos({ x, y });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    // Stop scrolling on mobile while drawing
    // (Note: e.preventDefault might be ignored in React synthetic events, 
    // so we also added the document listener in useEffect)
    // e.preventDefault(); 

    const { x: currentX, y: currentY } = getCoordinates(e);

    // 1. Draw locally (so it feels fast)
    drawOnCanvas(currentX, currentY, prevPos.x, prevPos.y, USER_COLOR);

    // 2. Send data to Backend
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/draw',
        body: JSON.stringify({
          x: currentX,
          y: currentY,
          prevX: prevPos.x,
          prevY: prevPos.y,
          color: USER_COLOR
        })
      });
    }

    setPrevPos({ x: currentX, y: currentY });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div style={{ overflow: 'hidden', height: '100vh', width: '100vw', background: '#f0f0f0', touchAction: 'none' }}>
      <h3 style={{ position: 'absolute', top: 10, left: 20, zIndex: 10, pointerEvents: 'none' }}>
        SyncDraw: <span style={{ color: USER_COLOR }}>You are this color</span>
      </h3>
      <canvas
        ref={canvasRef}
        
        // Mouse Events
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        
        // Touch Events (For Mobile)
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        
        style={{ cursor: 'crosshair', display: 'block', touchAction: 'none' }}
      />
    </div>
  );
}

export default App;