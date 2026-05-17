import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { GoogleLogin } from '@react-oauth/google';
import throttle from 'lodash.throttle';

const INITIAL_COLOR = '#38bdf8';
const INITIAL_SIZE = 4;

const IconPen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);
const IconEraser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/>
  </svg>
);
const IconHand = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V3a2 2 0 0 0-4 0v9"/><path d="M6 14v-2a2 2 0 0 0-4 0v6c0 4.4 3.6 8 8 8h2c4.4 0 8-3.6 8-8v-7a2 2 0 0 0-4 0v2"/>
  </svg>
);
const IconRecenter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
  </svg>
);
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

function App() {
  const canvasRef     = useRef(null);
  const socketRef     = useRef(null);
  const camera        = useRef({ x: 0, y: 0, z: 1 });
  const isPanning     = useRef(false);
  const lastPan       = useRef({ x: 0, y: 0 });
  const localStrokes  = useRef([]);
  const prevPos       = useRef({ x: 0, y: 0 });
  const isDrawing     = useRef(false);

  const [token, setToken]               = useState(localStorage.getItem('syncdraw_token') || null);
  const [color, setColor]               = useState(INITIAL_COLOR);
  const [brushSize, setBrushSize]       = useState(INITIAL_SIZE);
  const [connectedUsers, setConnected]  = useState(1);
  const [activeTool, setActiveTool]     = useState('pen'); // 'pen', 'eraser', 'pan'

  // ── Render ────────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    
    // 1. Clear entirely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw strokes
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(camera.current.x, camera.current.y);
    ctx.scale(camera.current.z, camera.current.z);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const s of localStrokes.current) {
      ctx.beginPath();
      if (s.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000'; // alpha channel is what matters
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
      }
      ctx.lineWidth = s.lineWidth;
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw grid underneath
    ctx.globalCompositeOperation = 'destination-over';
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gs = 24 * camera.current.z;
    const ox = ((camera.current.x % gs) + gs) % gs;
    const oy = ((camera.current.y % gs) + gs) % gs;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = ox - gs; x < W + gs; x += gs) {
      for (let y = oy - gs; y < H + gs; y += gs) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 4. Draw dark background beneath everything
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset composite mode
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // ── Socket & event setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    redraw();

    const onResize = () => requestAnimationFrame(redraw);
    window.addEventListener('resize', onResize);

    const canvas = canvasRef.current;

    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        camera.current.x = mx - (mx - camera.current.x) * factor;
        camera.current.y = my - (my - camera.current.y) * factor;
        camera.current.z = Math.min(Math.max(camera.current.z * factor, 0.05), 10);
      } else {
        camera.current.x -= e.deltaX;
        camera.current.y -= e.deltaY;
      }
      requestAnimationFrame(redraw);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:8080', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect',       () => console.log('✅ connected'));
    socket.on('user-count',    (n) => setConnected(n));
    socket.on('init-canvas',   (h) => { localStrokes.current = h; requestAnimationFrame(redraw); });
    socket.on('draw-stroke',   (d) => { localStrokes.current.push(d); requestAnimationFrame(redraw); });
    socket.on('clear-canvas',  () => { localStrokes.current = []; requestAnimationFrame(redraw); });
    socket.on('connect_error', (e) => { if (e.message.includes('Authentication')) handleLogout(); });

    const noScroll = (e) => { if (e.target === canvas) e.preventDefault(); };
    document.body.addEventListener('touchstart', noScroll, { passive: false });
    document.body.addEventListener('touchmove',  noScroll, { passive: false });

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('wheel', onWheel);
      socket.disconnect();
      document.body.removeEventListener('touchstart', noScroll);
      document.body.removeEventListener('touchmove',  noScroll);
    };
  }, [token, redraw]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toWorld = (sx, sy) => ({
    x: (sx - camera.current.x) / camera.current.z,
    y: (sy - camera.current.y) / camera.current.z,
  });

  const screenOf = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if (e.touches?.length) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.nativeEvent.clientX - rect.left, y: e.nativeEvent.clientY - rect.top };
  };

  const emitStroke = useRef(
    throttle((data) => socketRef.current?.connected && socketRef.current.emit('draw-stroke', data), 15)
  ).current;

  // ── Pointer handlers ──────────────────────────────────────────────────────
  const onDown = (e) => {
    if (e.button === 1 || e.altKey || activeTool === 'pan') {
      isPanning.current = true;
      lastPan.current = { x: e.clientX || (e.touches && e.touches[0].clientX), y: e.clientY || (e.touches && e.touches[0].clientY) };
      return;
    }
    isDrawing.current = true;
    const s = screenOf(e);
    prevPos.current = toWorld(s.x, s.y);
  };

  const onMove = (e) => {
    if (isPanning.current) {
      const cx = e.clientX || (e.touches && e.touches[0].clientX);
      const cy = e.clientY || (e.touches && e.touches[0].clientY);
      camera.current.x += cx - lastPan.current.x;
      camera.current.y += cy - lastPan.current.y;
      lastPan.current = { x: cx, y: cy };
      requestAnimationFrame(redraw);
      return;
    }
    if (!isDrawing.current) return;

    const s = screenOf(e);
    const w = toWorld(s.x, s.y);
    const stroke = { 
      x0: prevPos.current.x, y0: prevPos.current.y, 
      x1: w.x, y1: w.y, 
      color, 
      lineWidth: brushSize,
      isEraser: activeTool === 'eraser'
    };

    localStrokes.current.push(stroke);
    requestAnimationFrame(redraw);
    emitStroke(stroke);
    prevPos.current = w;
  };

  const onUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const clearBoard = () => {
    localStrokes.current = [];
    requestAnimationFrame(redraw);
    socketRef.current?.connected && socketRef.current.emit('clear-canvas');
  };

  const recenter = () => {
    camera.current = { x: 0, y: 0, z: 1 };
    requestAnimationFrame(redraw);
  };

  const download = () => {
    const a = document.createElement('a');
    a.download = 'syncdraw.png';
    a.href = canvasRef.current?.toDataURL();
    a.click();
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('syncdraw_token');
    socketRef.current?.disconnect();
    localStrokes.current = [];
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-dot" />
            SyncDraw
          </div>
          <h1>Canvas for<br />Creative Minds.</h1>
          <p>Real-time drawing. Zero latency. Infinite space.</p>
          <div className="login-google-wrap">
            <GoogleLogin
              onSuccess={(r) => { setToken(r.credential); localStorage.setItem('syncdraw_token', r.credential); }}
              onError={() => console.log('Login failed')}
              theme="filled_black"
              size="large"
              text="continue_with"
              shape="pill"
              width="320"
            />
          </div>
          <p className="login-footer">Sign in securely with Google.</p>
        </div>
      </div>
    );
  }

  // ── App ───────────────────────────────────────────────────────────────────
  const dotSize = Math.min(Math.max(brushSize, 4), 20);

  return (
    <div className={`app mode-${activeTool} ${isPanning.current ? 'is-panning' : ''}`}>
      {/* Toolbar */}
      <div className="toolbar">

        {/* Tools */}
        <button className={`icon-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Pen Tool">
          <IconPen />
        </button>
        <button className={`icon-btn ${activeTool === 'eraser' ? 'active' : ''}`} onClick={() => setActiveTool('eraser')} title="Eraser">
          <IconEraser />
        </button>
        <button className={`icon-btn ${activeTool === 'pan' ? 'active' : ''}`} onClick={() => setActiveTool('pan')} title="Pan Tool">
          <IconHand />
        </button>

        <div className="sep" />

        {/* Color */}
        <div className="color-swatch" style={{ background: color, opacity: activeTool === 'eraser' ? 0.3 : 1 }}>
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setActiveTool('pen'); }} />
        </div>

        {/* Brush Slider */}
        <div className="brush-row">
          <div className="brush-dot" style={{ width: dotSize, height: dotSize, background: activeTool === 'eraser' ? '#fff' : color }} />
          <input
            type="range" min="2" max="50" value={brushSize}
            onChange={(e) => setBrushSize(+e.target.value)}
            className="brush-slider"
          />
        </div>

        <div className="sep" />

        {/* Actions */}
        <button className="icon-btn" onClick={recenter} title="Re-center Camera">
          <IconRecenter />
        </button>
        <button className="icon-btn danger" onClick={clearBoard} title="Clear Canvas">
          <IconTrash />
        </button>
        <button className="icon-btn" onClick={download} title="Export Image">
          <IconDownload />
        </button>

        <div className="sep" />

        {/* Live Status */}
        <div className="live" title="Connected Users">
          <span className="live-dot" />
          {connectedUsers}
        </div>

        <div className="sep" />

        {/* Logout */}
        <button className="text-btn" onClick={handleLogout}>
          <IconLogout /> Logout
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

export default App;