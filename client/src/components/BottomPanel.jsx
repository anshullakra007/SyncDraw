import React from 'react';

const COLORS = [
  { id: 'black', value: '#0f172a', label: 'Black' },
  { id: 'slate', value: '#64748b', label: 'Gray' },
  { id: 'red', value: '#ef4444', label: 'Red' },
  { id: 'blue', value: '#3b82f6', label: 'Blue' },
  { id: 'green', value: '#10b981', label: 'Green' },
];

const SIZES = [
  { id: 'thin', value: 2, dotSize: 4 },
  { id: 'small', value: 4, dotSize: 6 },
  { id: 'medium', value: 8, dotSize: 10 },
  { id: 'large', value: 16, dotSize: 14 },
];

export function BottomPanel({ activeTool, color, setColor, brushSize, setBrushSize, onClear }) {
  // Only show contextual panel for tools that need it
  if (activeTool !== 'pen' && activeTool !== 'eraser') return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-4">

        {/* Colors (only for pen) */}
        {activeTool === 'pen' && (
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.value)}
                className={`w-7 h-7 rounded-full transition-all hover:scale-110 flex items-center justify-center ${
                  color === c.value 
                    ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' 
                    : 'ring-1 ring-slate-200'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        )}

        {activeTool === 'pen' && (
          <div className="w-px h-8 bg-slate-200" />
        )}

        {/* Stroke Width */}
        <div className="flex items-center gap-2">
          {SIZES.map((s) => (
            <button
              key={s.id}
              onClick={() => setBrushSize(s.value)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                brushSize === s.value 
                  ? 'bg-indigo-100' 
                  : 'hover:bg-slate-100'
              }`}
              title={`${s.id} stroke`}
            >
              <div 
                className="rounded-full bg-slate-700"
                style={{ width: s.dotSize, height: s.dotSize }}
              />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
