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
        <div className="glass-card">
          <h1>SyncDraw</h1>
          <p>Collaborate and create together in real-time.</p>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              setToken(credentialResponse.credential);
              localStorage.setItem('syncdraw_token', credentialResponse.credential);
            }}
            onError={() => {
              console.log('Login Failed');
            }}
            shape="pill"
            theme="filled_black"
            size="large"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      
      {/* 🛠️ Floating Toolbar */}
      <div className="toolbar">
        
        {/* Color Picker */}
        <input 
          className="color-picker"
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
        />

        {/* Brush Size Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Size:</span>
          <input 
            type="range" min="1" max="20" 
            value={brushSize} 
            onChange={(e) => setBrushSize(e.target.value)}
            style={{ width: '80px', cursor: 'pointer' }} 
          />
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '30px', background: 'rgba(0,0,0,0.1)' }}></div>

        {/* Actions */}
        <button onClick={handleUndo} className="toolbar-btn" title="Undo">↩️</button>
        <button onClick={clearBoard} className="toolbar-btn" title="Clear">🧹</button>
        <button onClick={downloadBoard} className="toolbar-btn" title="Save">💾</button>
        
        {/* Separator */}
        <div style={{ width: '1px', height: '30px', background: 'rgba(0,0,0,0.1)' }}></div>
        <button onClick={handleLogout} className="toolbar-btn" title="Logout">🚪</button>
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