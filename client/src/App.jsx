import { useRef, useState, useMemo } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import throttle from 'lodash.throttle';

import { useSocket } from './hooks/useSocket';
import { useCanvas } from './hooks/useCanvas';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';

const INITIAL_COLOR = '#0f172a';
const INITIAL_SIZE = 4;

function App() {
  const [token, setToken] = useState(localStorage.getItem('syncdraw_token') || null);
  const [color, setColor] = useState(INITIAL_COLOR);
  const [brushSize, setBrushSize] = useState(INITIAL_SIZE);
  const [activeTool, setActiveTool] = useState('pen');

  // Canvas Hook handles all rendering and camera logic
  const { canvasRef, camera, localStrokes, redraw, toWorld } = useCanvas();
  const lastSyncIndex = useRef(0);

  // Socket Hooks handle networking and callbacks
  const { isConnected, userCount, emitStroke, emitClear } = useSocket(token, {
    onInitCanvas: (serverStrokes) => {
      const offlineStrokes = localStrokes.current.slice(lastSyncIndex.current);
      localStrokes.current = [...serverStrokes, ...offlineStrokes];
      lastSyncIndex.current = serverStrokes.length;
      redraw();
    },
    onDrawStroke: (d) => {
      localStrokes.current.push(d);
      lastSyncIndex.current = localStrokes.current.length;
      redraw();
    },
    onClearCanvas: () => {
      localStrokes.current = [];
      lastSyncIndex.current = 0;
      redraw();
    },
    onError: (e) => {
      if (e.message.includes('Authentication')) {
        handleLogout();
      }
    }
  });

  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const prevPos = useRef({ x: 0, y: 0 });
  const isDrawing = useRef(false);

  const screenOf = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if (e.touches?.length) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.nativeEvent.clientX - rect.left, y: e.nativeEvent.clientY - rect.top };
  };

  const throttledEmit = useMemo(() => throttle((data) => emitStroke(data), 15), [emitStroke]);

  // ── Pointer handlers
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
      redraw();
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
    redraw();
    throttledEmit(stroke);
    prevPos.current = w;
  };

  const onUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
  };

  // ── Actions
  const clearBoard = () => {
    localStrokes.current = [];
    redraw();
    emitClear();
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
    localStrokes.current = [];
  };

  // ── Login Page (Tailwind refactor)
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-100 opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-emerald-100 opacity-50 blur-3xl" />

        <div className="relative w-full max-w-md p-10 bg-white border border-slate-200 rounded-3xl shadow-xl z-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-900 rounded-xl mb-6 shadow-md flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SyncDraw</h1>
          <p className="text-slate-500 mb-8 px-4">Collaborative workspace for your team. Real-time drawing, infinite canvas.</p>
          
          <div className="w-full flex justify-center">
            <GoogleLogin
              onSuccess={(r) => { setToken(r.credential); localStorage.setItem('syncdraw_token', r.credential); }}
              onError={() => console.log('Login failed')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              width="320"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── App
  return (
    <div className={`app mode-${activeTool} ${isPanning.current ? 'is-panning' : ''} relative w-screen h-screen overflow-hidden bg-white`}>
      
      {/* Offline Alert */}
      {!isConnected && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full z-[100] text-sm font-medium shadow-md shadow-red-500/20">
          Reconnecting to server...
        </div>
      )}

      {/* Floating UI Elements */}
      <TopBar 
        userCount={userCount} 
        onClear={clearBoard} 
        onExport={download} 
      />

      <Toolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        color={color} 
        setColor={setColor} 
        brushSize={brushSize} 
        setBrushSize={setBrushSize} 
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0"
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