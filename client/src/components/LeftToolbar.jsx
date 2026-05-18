import React from 'react';
import { MousePointer2, Pen, Eraser, StickyNote, Type, Square } from 'lucide-react';

export function LeftToolbar({ activeTool, setActiveTool }) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200 flex flex-col gap-1">
        
        <ToolButton 
          icon={<MousePointer2 size={20} />} 
          active={activeTool === 'pan'} 
          onClick={() => setActiveTool('pan')} 
          title="Select / Pan"
        />
        <ToolButton 
          icon={<Pen size={20} />} 
          active={activeTool === 'pen'} 
          onClick={() => setActiveTool('pen')} 
          title="Draw"
        />
        <ToolButton 
          icon={<Eraser size={20} />} 
          active={activeTool === 'eraser'} 
          onClick={() => setActiveTool('eraser')} 
          title="Eraser"
        />

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* Placeholders for future features */}
        <ToolButton 
          icon={<StickyNote size={20} />} 
          active={activeTool === 'sticky'} 
          onClick={() => setActiveTool('sticky')} 
          title="Sticky Note (Coming Soon)"
        />
        <ToolButton 
          icon={<Type size={20} />} 
          active={activeTool === 'text'} 
          onClick={() => setActiveTool('text')} 
          title="Text (Coming Soon)"
        />
        <ToolButton 
          icon={<Square size={20} />} 
          active={activeTool === 'shapes'} 
          onClick={() => setActiveTool('shapes')} 
          title="Shapes (Coming Soon)"
        />

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
        active 
          ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
    </button>
  );
}
