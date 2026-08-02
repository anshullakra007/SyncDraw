import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';

export function ZoomControls({ cameraRef, redraw }) {
  const [zoomPercent, setZoomPercent] = useState(100);

  // Sync the zoom percentage display whenever redraw fires
  useEffect(() => {
    let active = true;
    const syncZoom = () => {
      if (!active) return;
      const z = cameraRef?.current?.z || 1;
      setZoomPercent(Math.round(z * 100));
      requestAnimationFrame(syncZoom);
    };
    syncZoom();
    return () => { active = false; };
  }, [cameraRef]);

  const zoomIn = useCallback(() => {
    if (!cameraRef?.current) return;
    const c = cameraRef.current;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const factor = 1.2;
    c.x = cx - (cx - c.x) * factor;
    c.y = cy - (cy - c.y) * factor;
    c.z = Math.min(c.z * factor, 10);
    redraw();
  }, [cameraRef, redraw]);

  const zoomOut = useCallback(() => {
    if (!cameraRef?.current) return;
    const c = cameraRef.current;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const factor = 0.8;
    c.x = cx - (cx - c.x) * factor;
    c.y = cy - (cy - c.y) * factor;
    c.z = Math.max(c.z * factor, 0.05);
    redraw();
  }, [cameraRef, redraw]);

  const resetZoom = useCallback(() => {
    if (!cameraRef?.current) return;
    const c = cameraRef.current;
    c.x = 0;
    c.y = 0;
    c.z = 1;
    redraw();
  }, [cameraRef, redraw]);

  return (
    <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2">
      <button
        onClick={resetZoom}
        className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        title="Recenter Canvas to Origin (0)"
      >
        <Maximize2 size={14} className="text-indigo-600" />
        <span>Center Canvas</span>
      </button>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 flex items-center overflow-hidden">
        <button 
          onClick={zoomOut}
          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom Out (-)"
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={resetZoom}
          className="px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors min-w-[52px] text-center tabular-nums"
          title="Reset Zoom to 100% (0)"
        >
          {zoomPercent}%
        </button>
        <button 
          onClick={zoomIn}
          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom In (+)"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}


