import React from 'react';
import { Palette } from 'lucide-react';

const COLORS = [
  { id: 'black', value: '#0f172a', label: 'Black (#0F172A)' },
  { id: 'slate', value: '#64748b', label: 'Gray (#64748B)' },
  { id: 'red', value: '#ef4444', label: 'Red (#EF4444)' },
  { id: 'orange', value: '#f97316', label: 'Orange (#F97316)' },
  { id: 'amber', value: '#eab308', label: 'Amber (#EAB308)' },
  { id: 'green', value: '#10b981', label: 'Green (#10B981)' },
  { id: 'cyan', value: '#06b6d4', label: 'Cyan (#06B6D4)' },
  { id: 'blue', value: '#3b82f6', label: 'Blue (#3B82F6)' },
  { id: 'purple', value: '#8b5cf6', label: 'Purple (#8B5CF6)' },
  { id: 'pink', value: '#ec4899', label: 'Pink (#EC4899)' },
];

const SIZES = [
  { id: '2px Fine', value: 2, dotSize: 4, label: '2px' },
  { id: '4px Medium', value: 4, dotSize: 6, label: '4px' },
  { id: '8px Bold', value: 8, dotSize: 10, label: '8px' },
  { id: '16px Heavy', value: 16, dotSize: 14, label: '16px' },
];

export function BottomPanel({ activeTool, color, setColor, brushSize, setBrushSize }) {
  // Show contextual panel for any drawing or shape tool
  if (activeTool === 'pan') return null;

  const isPresetColor = COLORS.some(c => c.value.toLowerCase() === color.toLowerCase());

  const getToolName = (tool) => {
    switch (tool) {
      case 'pen': return 'Pen Tool';
      case 'eraser': return 'Eraser';
      case 'line': return 'Line Tool';
      case 'rectangle': return 'Rectangle';
      case 'circle': return 'Circle';
      case 'arrow': return 'Arrow';
      case 'text': return 'Text Note';
      default: return 'Tool';
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-3.5">

        {/* Active Tool Name Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            {getToolName(activeTool)}
          </span>
        </div>

        {/* Colors (for pen and shapes) */}
        {activeTool !== 'eraser' && (
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.value)}
                className={`w-7 h-7 rounded-full transition-all duration-150 hover:scale-110 flex items-center justify-center ${
                  color.toLowerCase() === c.value.toLowerCase()
                    ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110 shadow-sm' 
                    : 'ring-1 ring-slate-200 hover:ring-slate-400'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}

            {/* Custom Hex Color Picker Swatch */}
            <label 
              className={`relative w-7 h-7 rounded-full cursor-pointer transition-all duration-150 hover:scale-110 flex items-center justify-center overflow-hidden border ${
                !isPresetColor
                  ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110 border-indigo-500 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-400'
              }`}
              style={{
                background: !isPresetColor 
                  ? color 
                  : 'linear-gradient(135deg, #ef4444, #eab308, #10b981, #3b82f6, #8b5cf6)'
              }}
              title="Custom Hex Color Picker"
            >
              <Palette size={13} className="text-white drop-shadow-md" />
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-swatch-input"
              />
            </label>
          </div>
        )}

        {activeTool !== 'eraser' && (
          <div className="w-px h-7 bg-slate-200" />
        )}

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s.label}
              onClick={() => setBrushSize(s.value)}
              className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-150 ${
                brushSize === s.value 
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={`${s.id} thickness`}
            >
              <div 
                className={`rounded-full ${brushSize === s.value ? 'bg-white' : 'bg-slate-700'}`}
                style={{ width: s.dotSize, height: s.dotSize }}
              />
              <span className="text-[11px] font-mono">{s.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}


