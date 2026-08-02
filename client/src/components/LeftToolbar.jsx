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
      <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/80 flex flex-col gap-1.5">
        
        {/* Basic Drawing Tools */}
        <ToolButton 
          icon={<MousePointer2 size={19} />} 
          active={activeTool === 'pan'} 
          onClick={() => setActiveTool('pan')} 
          title="Select / Pan"
          badge="V"
        />
        <ToolButton 
          icon={<Pen size={19} />} 
          active={activeTool === 'pen'} 
          onClick={() => setActiveTool('pen')} 
          title="Draw Pen"
          badge="P"
        />
        <ToolButton 
          icon={<Eraser size={19} />} 
          active={activeTool === 'eraser'} 
          onClick={() => setActiveTool('eraser')} 
          title="Eraser"
          badge="E"
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Shape Tools */}
        <ToolButton 
          icon={<Minus size={19} />} 
          active={activeTool === 'line'} 
          onClick={() => setActiveTool('line')} 
          title="Straight Line"
          badge="L"
        />
        <ToolButton 
          icon={<Square size={19} />} 
          active={activeTool === 'rectangle'} 
          onClick={() => setActiveTool('rectangle')} 
          title="Rectangle"
          badge="R"
        />
        <ToolButton 
          icon={<Circle size={19} />} 
          active={activeTool === 'circle'} 
          onClick={() => setActiveTool('circle')} 
          title="Circle / Ellipse"
          badge="C"
        />
        <ToolButton 
          icon={<ArrowRight size={19} />} 
          active={activeTool === 'arrow'} 
          onClick={() => setActiveTool('arrow')} 
          title="Arrow"
          badge="A"
        />
        <ToolButton 
          icon={<Type size={19} />} 
          active={activeTool === 'text'} 
          onClick={() => setActiveTool('text')} 
          title="Text Note"
          badge="T"
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Actions */}
        <ToolButton 
          icon={<Undo2 size={19} />} 
          active={false} 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo Last Stroke"
          badge="Ctrl+Z"
        />
        <ToolButton 
          icon={<Redo2 size={19} />} 
          active={false} 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo Stroke"
          badge="Ctrl+Y"
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
          title="Keyboard Shortcuts"
          badge="?"
        />

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, title, badge, danger, disabled }) {
  return (
    <div className="relative group flex items-center">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
          disabled
            ? 'opacity-30 cursor-not-allowed text-slate-400'
            : active 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105 font-medium' 
              : danger 
                ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {icon}
      </button>

      {/* Sleek animated tooltip on hover */}
      <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-[100] flex items-center gap-2 border border-slate-700/60 backdrop-blur-md translate-x-1 group-hover:translate-x-0">
        <span>{title}</span>
        {badge && (
          <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono font-bold border border-slate-700">
            {badge}
          </kbd>
        )}
      </div>
    </div>
  );
}


