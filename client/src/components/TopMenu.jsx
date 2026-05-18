import React from 'react';
import { Share, Download } from 'lucide-react';

export function TopMenu({ userCount, onExport }) {
  return (
    <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
      
      {/* Top Left: Logo & Title */}
      <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 pointer-events-auto">
        <div className="w-6 h-6 bg-slate-900 rounded-md shadow-sm flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-sm" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 leading-none">SyncDraw</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Untitled Board</span>
        </div>
      </div>

      {/* Top Right: Actions & Live Status */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Live Users */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-200">
          <div className="flex -space-x-2 mr-1">
            {/* Mock Avatars based on user count */}
            {Array.from({ length: Math.min(userCount, 3) }).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">
                U{i+1}
              </div>
            ))}
            {userCount > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                +{userCount - 3}
              </div>
            )}
          </div>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Share Button */}
        <button className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-colors text-sm font-medium">
          <Share size={16} />
          Share
        </button>

        {/* Export Button */}
        <button 
          onClick={onExport}
          className="flex items-center justify-center w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-colors"
          title="Export Image"
        >
          <Download size={18} />
        </button>
      </div>

    </div>
  );
}
