import React from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';

export function ZoomControls({ camera, redraw }) {
  const zoomPercent = Math.round((camera.current?.z || 1) * 100);

  const zoomIn = () => {
    const c = camera.current;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const factor = 1.2;
    c.x = cx - (cx - c.x) * factor;
    c.y = cy - (cy - c.y) * factor;
    c.z = Math.min(c.z * factor, 10);
    redraw();
  };

  const zoomOut = () => {
    const c = camera.current;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const factor = 0.8;
    c.x = cx - (cx - c.x) * factor;
    c.y = cy - (cy - c.y) * factor;
    c.z = Math.max(c.z * factor, 0.05);
    redraw();
  };

  const resetZoom = () => {
    camera.current = { x: 0, y: 0, z: 1 };
    redraw();
  };

  return (
    <div className="absolute bottom-6 right-6 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 flex items-center overflow-hidden">
        <button 
          onClick={zoomOut}
          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom Out"
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={resetZoom}
          className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors min-w-[48px] text-center"
          title="Reset Zoom"
        >
          {zoomPercent}%
        </button>
        <button 
          onClick={zoomIn}
          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
