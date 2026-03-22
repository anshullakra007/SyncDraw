import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { GoogleLogin } from '@react-oauth/google';

// 🛠️ Default Configuration
const INITIAL_COLOR = '#000000';
const INITIAL_SIZE = 5;

function App() {
  const canvasRef = useRef(null);
  const stompClientRef = useRef(null);

  // 🎨 State Management
  const [token, setToken] = useState(localStorage.getItem('syncdraw_token') || null);
  const [color, setColor] = useState(INITIAL_COLOR);
  const [brushSize, setBrushSize] = useState(INITIAL_SIZE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState({ x: 0, y: 0 });
  
  // ↩️ Undo/Redo History
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  useEffect(() => {
    if (!token) return;

    // 1. Setup Canvas
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#f0f0f0'; // Background color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill bg so save works

    // 2. Connect to WebSocket
    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/websocket',
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: () => {
        console.log('✅ Connected to WebSocket');
        client.subscribe('/topic/canvas', (message) => {
          const data = JSON.parse(message.body);
          handleIncomingDraw(data);
        });
      },
    });

    client.activate();
    stompClientRef.current = client;

    // 3. Prevent Mobile Scrolling
    const preventScroll = (e) => {
      if (e.target === canvas) e.preventDefault();
    };
    document.body.addEventListener('touchstart', preventScroll, { passive: false });
    document.body.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      client.deactivate();
      document.body.removeEventListener('touchstart', preventScroll);
      document.body.removeEventListener('touchmove', preventScroll);
    };
  }, [token]);

  // 📩 Handle Messages from Server
  const handleIncomingDraw = (data) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 🧹 Handle "Clear Board" Signal
    if (data.color === 'CLEAR') {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // 🖌️ Handle Drawing
    // Protocol: "HEXCOLOR:SIZE" (e.g., "#FF0000:5")
    const [remoteColor, remoteSize] = data.color.split(':');
    
    ctx.beginPath();
    ctx.strokeStyle = remoteColor;
    ctx.lineWidth = parseInt(remoteSize || 5, 10);
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  };

  // 👆 Coordinate Helper (Mouse + Touch)
  const getCoordinates = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  // 🖱️ Start Drawing
  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setPrevPos({ x, y });
    saveHistory(); // Save state before new stroke
  };

  // 🖱️ Draw Move
  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    // Draw Locally
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Send to Network
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: '/app/draw',
        body: JSON.stringify({
          x, y, 
          prevX: prevPos.x, 
          prevY: prevPos.y, 
          // 🧠 Hack: Pack Size into Color string
          color: `${color}:${brushSize}` 
        })
      });
    }

    setPrevPos({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 💾 Save History for Undo
  const saveHistory = () => {
    const canvas = canvasRef.current;
    // Limit history to 20 steps to save memory
    if (history.length >= 20) history.shift(); 
    setHistory([...history, canvas.toDataURL()]);
    setRedoStack([]); // Clear redo stack on new action
  };

  // ↩️ Undo Function
  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const previousState = history[history.length - 1];
    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    setRedoStack([canvas.toDataURL(), ...redoStack]);
    setHistory(history.slice(0, -1));
  };

  // 🧹 Clear Board Function
  const clearBoard = () => {
    // 1. Clear Locally
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Broadcast Clear
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: '/app/draw',
        body: JSON.stringify({ x:0, y:0, prevX:0, prevY:0, color: 'CLEAR' })
      });
    }
  };

  // 💾 Download Image
  const downloadBoard = () => {
    const link = document.createElement('a');
    link.download = 'syncdraw-masterpiece.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // 🚪 Logout
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('syncdraw_token');
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-left">
          <div className="login-content">
            <div className="login-logo">
              <div className="login-logo-icon"></div>
              SyncDraw
            </div>
            <h1>Log in to your canvas</h1>
            <p>Join your team's real-time collaborative workspace. Start sketching, mapping, and creating together.</p>
            
            <div style={{ marginTop: '0.5rem' }}>
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  setToken(credentialResponse.credential);
                  localStorage.setItem('syncdraw_token', credentialResponse.credential);
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
                theme="outline"
                size="large"
                text="continue_with"
                width="100%"
              />
            </div>
          </div>
        </div>
        <div className="login-right">
          {/* Subtle pattern background handled by CSS */}
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      
      {/* 🛠️ Professional Toolbar */}
      <div className="toolbar">
        
        {/* Color Picker */}
        <div className="color-picker-wrapper">
          <input 
            className="color-picker"
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
          />
        </div>

        <div className="toolbar-divider"></div>

        {/* Brush Size Slider */}
        <div className="size-slider-wrapper">
          <span>Size</span>
          <input 
            className="size-slider"
            type="range" min="1" max="20" 
            value={brushSize} 
            onChange={(e) => setBrushSize(e.target.value)}
          />
        </div>

        <div className="toolbar-divider"></div>

        {/* Actions */}
        <button onClick={handleUndo} className="toolbar-btn" title="Undo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          Undo
        </button>
        <button onClick={clearBoard} className="toolbar-btn" title="Clear">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Clear
        </button>
        <button onClick={downloadBoard} className="toolbar-btn" title="Save">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Save
        </button>
        
        <div className="toolbar-divider"></div>
        
        <button onClick={handleLogout} className="toolbar-btn" style={{ color: '#ef4444' }} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ cursor: 'crosshair', display: 'block' }}
      />
    </div>
  );
}

export default App;