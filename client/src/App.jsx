import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import throttle from 'lodash.throttle';
import { User, HelpCircle, X } from 'lucide-react';

import { useSocket } from './hooks/useSocket';
import { useCanvas } from './hooks/useCanvas';
import { TopMenu } from './components/TopMenu';
import { LeftToolbar } from './components/LeftToolbar';
import { BottomPanel } from './components/BottomPanel';
import { ZoomControls } from './components/ZoomControls';

const INITIAL_COLOR = '#0f172a';
const INITIAL_SIZE = 4;

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('syncdraw_token') || null);
  const [roomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'default';
  });

  const [color, setColor] = useState(INITIAL_COLOR);
  const [brushSize, setBrushSize] = useState(INITIAL_SIZE);
  const [activeTool, setActiveTool] = useState('pen');
  const [boardTitle, setBoardTitle] = useState('Untitled Board');
  const [remoteCursors, setRemoteCursors] = useState({});
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [textModal, setTextModal] = useState(null);

  const [isPanning, setIsPanning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Canvas Hook handles rendering, camera, shapes, and clean PNG export
  const { 
    canvasRef, 
    cameraRef, 
    strokesRef, 
    previewStrokeRef, 
    redraw, 
    toWorld, 
    toScreen, 
    exportCleanImage 
  } = useCanvas();

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  const updateUndoRedoUI = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const showToast = useCallback((msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }, []);

  // Socket Hooks handle networking and real-time events
  const { 
    isConnected, 
    userCount, 
    roomUsers, 
    emitStroke, 
    emitUndoStroke, 
    emitClear, 
    emitCursorMove, 
    emitTitleChange 
  } = useSocket(token, roomId, {
    onInitCanvas: ({ strokes, title }) => {
      strokesRef.current = Array.isArray(strokes) ? [...strokes] : [];
      if (title) setBoardTitle(title);
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
    },
    onDrawStroke: (d) => {
      if (!d) return;
      strokesRef.current.push(d);
      redraw();
    },
    onUndoStroke: ({ id }) => {
      if (!id) return;
      const idx = strokesRef.current.findIndex(s => s.id === id);
      if (idx !== -1) {
        strokesRef.current.splice(idx, 1);
        redraw();
      }
    },
    onClearCanvas: () => {
      strokesRef.current = [];
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
      showToast('Board cleared by collaborator.');
    },
    onCursorMove: ({ socketId, user, x, y }) => {
      if (!socketId) return;
      setRemoteCursors(prev => ({
        ...prev,
        [socketId]: { user, x, y, lastUpdated: Date.now() }
      }));
    },
    onCursorLeave: ({ socketId }) => {
      if (!socketId) return;
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    },
    onUpdateBoardTitle: (title) => {
      if (title) setBoardTitle(title);
    },
    onError: (e) => {
      if (e.message && e.message.includes('Authentication')) {
        handleLogout();
      }
    }
  });

  const lastPanRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const prevPosRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);

  const screenOf = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if (e.touches?.length) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.nativeEvent.clientX - rect.left, y: e.nativeEvent.clientY - rect.top };
  };

  const throttledEmitStroke = useMemo(() => throttle((data) => emitStroke(data), 15), [emitStroke]);
  const throttledCursorMove = useMemo(() => throttle((data) => emitCursorMove(data), 35), [emitCursorMove]);

  // ── Pointer Handlers
  const onDown = (e) => {
    if (e.button === 1 || e.altKey || activeTool === 'pan') {
      setIsPanning(true);
      lastPanRef.current = { x: e.clientX || (e.touches && e.touches[0].clientX), y: e.clientY || (e.touches && e.touches[0].clientY) };
      return;
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);

    const s = screenOf(e);
    const w = toWorld(s.x, s.y);
    startPosRef.current = w;
    prevPosRef.current = w;

    if (activeTool === 'text') {
      setTextModal({
        isOpen: true,
        x: s.x,
        y: s.y,
        worldX: w.x,
        worldY: w.y,
        text: ''
      });
      return;
    }

    isDrawingRef.current = true;
  };

  const handleTextModalSubmit = useCallback(() => {
    if (textModal && textModal.text && textModal.text.trim()) {
      const stroke = {
        id: crypto.randomUUID(),
        type: 'text',
        text: textModal.text.trim(),
        x0: textModal.worldX,
        y0: textModal.worldY,
        x1: textModal.worldX,
        y1: textModal.worldY,
        color,
        lineWidth: brushSize
      };
      strokesRef.current.push(stroke);
      undoStackRef.current.push(stroke);
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
      emitStroke(stroke);
    }
    setTextModal(null);
  }, [textModal, color, brushSize, redraw, emitStroke, updateUndoRedoUI, strokesRef]);

  const onMove = (e) => {
    const s = screenOf(e);
    const w = toWorld(s.x, s.y);

    // Broadcast live cursor position
    throttledCursorMove({ x: w.x, y: w.y });

    if (isPanning) {
      const cx = e.clientX || (e.touches && e.touches[0].clientX);
      const cy = e.clientY || (e.touches && e.touches[0].clientY);
      cameraRef.current.x += cx - lastPanRef.current.x;
      cameraRef.current.y += cy - lastPanRef.current.y;
      lastPanRef.current = { x: cx, y: cy };
      redraw();
      return;
    }

    if (!isDrawingRef.current) return;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      const stroke = { 
        id: crypto.randomUUID(),
        type: activeTool,
        x0: prevPosRef.current.x, 
        y0: prevPosRef.current.y, 
        x1: w.x, 
        y1: w.y, 
        color, 
        lineWidth: brushSize,
        isEraser: activeTool === 'eraser'
      };

      strokesRef.current.push(stroke);
      undoStackRef.current.push(stroke);
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
      throttledEmitStroke(stroke);
      prevPosRef.current = w;
    } else if (['line', 'rectangle', 'circle', 'arrow'].includes(activeTool)) {
      previewStrokeRef.current = {
        id: crypto.randomUUID(),
        type: activeTool,
        x0: startPosRef.current.x,
        y0: startPosRef.current.y,
        x1: w.x,
        y1: w.y,
        color,
        lineWidth: brushSize
      };
      redraw();
    }
  };

  const onUp = (e) => {
    e?.currentTarget?.releasePointerCapture?.(e.pointerId);

    if (isDrawingRef.current && ['line', 'rectangle', 'circle', 'arrow'].includes(activeTool) && previewStrokeRef.current) {
      const shapeStroke = { ...previewStrokeRef.current };
      strokesRef.current.push(shapeStroke);
      undoStackRef.current.push(shapeStroke);
      redoStackRef.current = [];
      updateUndoRedoUI();
      emitStroke(shapeStroke);
      previewStrokeRef.current = null;
      redraw();
    }

    isDrawingRef.current = false;
    setIsPanning(false);
  };

  // ── Actions: Undo / Redo / Clear
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const stroke = undoStackRef.current.pop();
    const idx = strokesRef.current.findIndex(s => s.id === stroke.id);
    if (idx !== -1) {
      strokesRef.current.splice(idx, 1);
      redoStackRef.current.push(stroke);
      updateUndoRedoUI();
      redraw();
      emitUndoStroke({ id: stroke.id });
    }
  }, [emitUndoStroke, redraw, strokesRef, updateUndoRedoUI]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const stroke = redoStackRef.current.pop();
    strokesRef.current.push(stroke);
    undoStackRef.current.push(stroke);
    updateUndoRedoUI();
    redraw();
    emitStroke(stroke);
  }, [emitStroke, redraw, strokesRef, updateUndoRedoUI]);

  const handleClearBoard = useCallback(() => {
    if (window.confirm('Clear entire whiteboard for all collaborators in this room?')) {
      strokesRef.current = [];
      undoStackRef.current = [];
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
      emitClear();
      showToast('Board cleared.');
    }
  }, [emitClear, redraw, showToast, strokesRef, updateUndoRedoUI]);

  // ── Export & Import Handlers
  const handleExportPNG = useCallback(() => {
    const dataUrl = exportCleanImage();
    const a = document.createElement('a');
    a.download = `${boardTitle.toLowerCase().replace(/\s+/g, '-')}-syncdraw.png`;
    a.href = dataUrl;
    a.click();
    showToast('Exported PNG image.');
  }, [boardTitle, exportCleanImage, showToast]);

  const handleExportJSON = useCallback(() => {
    const projectData = {
      version: 1,
      title: boardTitle,
      roomId,
      exportedAt: new Date().toISOString(),
      strokes: strokesRef.current
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${boardTitle.toLowerCase().replace(/\s+/g, '-')}.syncdraw`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Saved project file (.syncdraw).');
  }, [boardTitle, roomId, showToast, strokesRef]);

  const handleImportJSON = useCallback((projectData) => {
    if (projectData && Array.isArray(projectData.strokes)) {
      strokesRef.current = projectData.strokes;
      if (projectData.title) {
        setBoardTitle(projectData.title);
        emitTitleChange(projectData.title);
      }
      undoStackRef.current = [...projectData.strokes];
      redoStackRef.current = [];
      updateUndoRedoUI();
      redraw();
      for (const s of projectData.strokes) {
        emitStroke(s);
      }
      showToast('Loaded project file.');
    }
  }, [emitStroke, emitTitleChange, redraw, showToast, strokesRef, updateUndoRedoUI]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('syncdraw_token');
    strokesRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    updateUndoRedoUI();
  };

  // ── Keyboard Shortcuts Listener
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setActiveTool('pan');
        else if (k === 'p') setActiveTool('pen');
        else if (k === 'e') setActiveTool('eraser');
        else if (k === 'r') setActiveTool('rectangle');
        else if (k === 'c') setActiveTool('circle');
        else if (k === 'l') setActiveTool('line');
        else if (k === 'a') setActiveTool('arrow');
        else if (k === 't') setActiveTool('text');
        else if (k === '?') setShowHelpModal(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // ── Prune stale remote cursors older than 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRemoteCursors(prev => {
        const now = Date.now();
        let changed = false;
        const next = { ...prev };
        for (const [id, c] of Object.entries(next)) {
          if (now - (c.lastUpdated || 0) > 30000) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const cursorClass = activeTool === 'pen' ? 'mode-pen' : activeTool === 'eraser' ? 'mode-eraser' : 'mode-pan';

  // ── Login Page
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 relative overflow-hidden font-['Outfit']">
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[500px] h-[500px] rounded-full bg-indigo-100 opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[500px] h-[500px] rounded-full bg-emerald-100 opacity-40 blur-3xl" />

        <div className="relative w-full max-w-md p-10 bg-white border border-slate-200 rounded-3xl shadow-xl z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl mb-6 shadow-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-md" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">SyncDraw</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">Collaborative workspace for your team.<br />Real-time drawing on an infinite canvas.</p>
          
          <div className="w-full flex flex-col gap-3 items-center">
            <GoogleLogin
              onSuccess={(r) => { setToken(r.credential); localStorage.setItem('syncdraw_token', r.credential); }}
              onError={() => console.log('Login failed')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              width="320"
            />

            <button
              onClick={() => {
                setToken('guest');
                localStorage.setItem('syncdraw_token', 'guest');
              }}
              className="w-[320px] py-2.5 px-4 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <User size={16} className="text-indigo-600" />
              Continue as Guest / Try Demo
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-6">Secured with Google OAuth 2.0 & Demo Guest Auth</p>
        </div>
      </div>
    );
  }

  // ── Main App
  return (
    <div className={`app ${cursorClass} ${isPanning ? 'is-panning' : ''} relative w-screen h-screen overflow-hidden bg-white select-none`}>
      
      {/* Offline Alert */}
      {!isConnected && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[200] animate-pulse">
          <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-red-500/25 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            Reconnecting to server...
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[150] transition-all animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* On-Canvas Text Annotation Popover */}
      {textModal?.isOpen && (
        <div 
          className="absolute z-[120] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 w-72 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
          style={{ 
            left: Math.min(textModal.x, window.innerWidth - 300), 
            top: Math.min(textModal.y, window.innerHeight - 200) 
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Add Canvas Note</span>
            <button 
              onClick={() => setTextModal(null)} 
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={textModal.text}
            onChange={(e) => setTextModal({ ...textModal, text: e.target.value })}
            placeholder="Type your note here..."
            className="w-full h-24 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 resize-none font-medium"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextModalSubmit();
              } else if (e.key === 'Escape') {
                setTextModal(null);
              }
            }}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-[10px] text-slate-400">Enter to add • Esc to cancel</span>
            <div className="flex gap-2">
              <button
                onClick={() => setTextModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTextModalSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating UI Panels */}
      <TopMenu 
        userCount={userCount} 
        roomUsers={roomUsers}
        boardTitle={boardTitle}
        onTitleChange={(newTitle) => {
          setBoardTitle(newTitle);
          emitTitleChange(newTitle);
        }}
        roomId={roomId}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />

      <LeftToolbar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearBoard}
        onShowHelp={() => setShowHelpModal(true)}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <BottomPanel 
        activeTool={activeTool}
        color={color} 
        setColor={setColor} 
        brushSize={brushSize} 
        setBrushSize={setBrushSize} 
      />

      <ZoomControls 
        cameraRef={cameraRef} 
        redraw={redraw} 
      />

      {/* Real-Time Live Cursors Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {Object.entries(remoteCursors).map(([id, c]) => {
          const { x: sx, y: sy } = toScreen(c.x, c.y);
          return (
            <div
              key={id}
              className="absolute transition-transform duration-75 ease-out flex flex-col items-start"
              style={{ transform: `translate3d(${sx}px, ${sy}px, 0)` }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={c.user?.color || '#6366f1'} xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8C5.5 21.6 6.43 22.04 7.04 21.52L11.53 17.65L15.34 22.9C15.65 23.33 16.26 23.44 16.69 23.13L18.49 21.84C18.93 21.53 19.04 20.91 18.73 20.49L14.86 15.17H20.5C21.35 15.17 21.82 14.19 21.28 13.54L6.96 2.68C6.34 2.11 5.5 2.55 5.5 3.21Z" stroke="white" strokeWidth="1.5"/>
              </svg>
              <span 
                className="ml-3 -mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: c.user?.color || '#6366f1' }}
              >
                {c.user?.name || 'User'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-800">Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              <ShortcutRow label="Draw Pen" shortcut="P" />
              <ShortcutRow label="Eraser" shortcut="E" />
              <ShortcutRow label="Select / Pan" shortcut="V" />
              <ShortcutRow label="Straight Line" shortcut="L" />
              <ShortcutRow label="Rectangle" shortcut="R" />
              <ShortcutRow label="Circle / Ellipse" shortcut="C" />
              <ShortcutRow label="Arrow" shortcut="A" />
              <ShortcutRow label="Text Note" shortcut="T" />
              <ShortcutRow label="Undo" shortcut="Ctrl + Z" />
              <ShortcutRow label="Redo" shortcut="Ctrl + Y" />
              <ShortcutRow label="Zoom In / Out" shortcut="+ / -" />
              <ShortcutRow label="Reset Zoom" shortcut="0" />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

function ShortcutRow({ label, shortcut }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100">
      <span className="text-slate-600 font-medium">{label}</span>
      <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-mono font-semibold">
        {shortcut}
      </kbd>
    </div>
  );
}

export default App;
