import React from 'react';
import { 
  MousePointer2, 
  Pen, 
  Eraser, 
  Minus, 
  Square, 
  Circle, 
  ArrowRight, 
  Type, 
  Undo2, 
  Redo2, 
  Trash2, 
  HelpCircle 
} from 'lucide-react';

export function LeftToolbar({ 
  activeTool, 
  setActiveTool, 
  onUndo, 
  onRedo, 
  onClear, 
  onShowHelp,
  canUndo = true,
  canRedo = false 
}) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200 flex flex-col gap-1">
        
        {/* Basic Drawing Tools */}
        <ToolButton 
          icon={<MousePointer2 size={19} />} 
          active={activeTool === 'pan'} 
          onClick={() => setActiveTool('pan')} 
          title="Select / Pan (V or Alt+Drag)"
        />
        <ToolButton 
          icon={<Pen size={19} />} 
          active={activeTool === 'pen'} 
          onClick={() => setActiveTool('pen')} 
          title="Draw Pen (P)"
        />
        <ToolButton 
          icon={<Eraser size={19} />} 
          active={activeTool === 'eraser'} 
          onClick={() => setActiveTool('eraser')} 
          title="Eraser (E)"
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Shape Tools */}
        <ToolButton 
          icon={<Minus size={19} />} 
          active={activeTool === 'line'} 
          onClick={() => setActiveTool('line')} 
          title="Line (L)"
        />
        <ToolButton 
          icon={<Square size={19} />} 
          active={activeTool === 'rectangle'} 
          onClick={() => setActiveTool('rectangle')} 
          title="Rectangle (R)"
        />
        <ToolButton 
          icon={<Circle size={19} />} 
          active={activeTool === 'circle'} 
          onClick={() => setActiveTool('circle')} 
          title="Circle / Ellipse (C)"
        />
        <ToolButton 
          icon={<ArrowRight size={19} />} 
          active={activeTool === 'arrow'} 
          onClick={() => setActiveTool('arrow')} 
          title="Arrow (A)"
        />
        <ToolButton 
          icon={<Type size={19} />} 
          active={activeTool === 'text'} 
          onClick={() => setActiveTool('text')} 
          title="Text Note (T)"
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Actions */}
        <ToolButton 
          icon={<Undo2 size={19} />} 
          active={false} 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo Last Stroke (Ctrl+Z)"
        />
        <ToolButton 
          icon={<Redo2 size={19} />} 
          active={false} 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo Stroke (Ctrl+Y)"
        />
        <ToolButton 
          icon={<Trash2 size={19} />} 
          active={false} 
          onClick={onClear} 
          title="Clear Canvas"
          danger
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Help */}
        <ToolButton 
          icon={<HelpCircle size={19} />} 
          active={false} 
          onClick={onShowHelp} 
          title="Keyboard Shortcuts (?)"
        />

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, title, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
        disabled
          ? 'opacity-30 cursor-not-allowed text-slate-400'
          : active 
            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
            : danger 
              ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
    </button>
  );
}

