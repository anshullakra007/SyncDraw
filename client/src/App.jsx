import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

// 🎨 Random color for this user
const USER_COLOR = '#' + Math.floor(Math.random()*16777215).toString(16);

function App() {
  const canvasRef = useRef(null);
  const stompClientRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // 1. Initialize Canvas
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    // 2. Connect to Java Backend
    const client = new Client({
      // We connect to the raw WebSocket endpoint exposed by Spring Boot
      brokerURL: 'ws://localhost:8080/ws/websocket', 
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

    // Cleanup on close
    return () => {
      client.deactivate();
    };
  }, []);

  // 🖌️ Helper: Draws a line on the canvas
  const drawOnCanvas = (x, y, prevX, prevY, color) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
  };

  // 🖱️ Mouse Events
  const startDrawing = (e) => {
    setIsDrawing(true);
    setPrevPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const currentX = e.nativeEvent.offsetX;
    const currentY = e.nativeEvent.offsetY;

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
    <div style={{ overflow: 'hidden', height: '100vh', width: '100vw', background: '#f0f0f0' }}>
      <h3 style={{ position: 'absolute', top: 10, left: 20, zIndex: 10 }}>
        SyncDraw: <span style={{color: USER_COLOR}}>You are this color</span>
      </h3>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        style={{ cursor: 'crosshair' }}
      />
    </div>
  );
}

export default App;