import React from 'react';
import { Trash2, Download } from 'lucide-react';

export function TopBar({ userCount, onClear, onExport }) {
  return (
    <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-5xl px-6 flex items-center justify-between pointer-events-auto">
        
        {/* Logo Area */}
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-200/50">
          <div className="w-6 h-6 bg-slate-900 rounded-md shadow-sm" />
          <span className="font-bold text-slate-800 tracking-tight">SyncDraw</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-2 rounded-2xl shadow-sm border border-slate-200/50">
          
          {/* Live Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/50 text-sm font-medium text-slate-600">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            {userCount} Online
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          {/* Action Buttons */}
          <button 
            onClick={onClear}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={onExport}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Export Image"
          >
            <Download size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
