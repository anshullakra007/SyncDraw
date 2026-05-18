import React from 'react';
import { Pen, Eraser, Hand, Circle } from 'lucide-react';

const COLORS = [
  { id: 'black', value: '#0f172a' },
  { id: 'slate', value: '#64748b' },
  { id: 'red', value: '#ef4444' },
  { id: 'green', value: '#10b981' },
  { id: 'blue', value: '#3b82f6' },
];

const SIZES = [
  { id: 'sm', value: 4 },
  { id: 'md', value: 8 },
  { id: 'lg', value: 16 },
];

export function Toolbar({ activeTool, setActiveTool, color, setColor, brushSize, setBrushSize }) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-1">
        
        {/* Tools */}
        <div className="flex items-center gap-1 px-2">
          <ToolButton 
            icon={<Pen size={20} />} 
            active={activeTool === 'pen'} 
            onClick={() => setActiveTool('pen')} 
            title="Pen"
          />
          <ToolButton 
            icon={<Eraser size={20} />} 
            active={activeTool === 'eraser'} 
            onClick={() => setActiveTool('eraser')} 
            title="Eraser"
          />
          <ToolButton 
            icon={<Hand size={20} />} 
            active={activeTool === 'pan'} 
            onClick={() => setActiveTool('pan')} 
            title="Pan Tool"
          />
        </div>

        <div className="w-px h-8 bg-slate-200 mx-2" />

        {/* Colors */}
        <div className="flex items-center gap-1.5 px-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setColor(c.value); setActiveTool('pen'); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${color === c.value && activeTool !== 'eraser' ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
              style={{ backgroundColor: c.value }}
              title={`Color ${c.id}`}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-2" />

        {/* Stroke Sizes */}
        <div className="flex items-center gap-2 px-2">
          {SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setBrushSize(s.value)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100 ${brushSize === s.value ? 'bg-slate-100' : ''}`}
              title={`Size ${s.id}`}
            >
              <div 
                className="rounded-full bg-slate-700" 
                style={{ width: s.value, height: s.value }}
              />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-full transition-all ${
        active 
          ? 'bg-slate-900 text-white shadow-md scale-105' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
    </button>
  );
}
