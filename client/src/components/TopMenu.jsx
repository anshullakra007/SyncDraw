import React, { useState, useRef } from 'react';
import { Share, Download, Check, Edit2, Image as ImageIcon, FileJson, FolderOpen } from 'lucide-react';

export function TopMenu({ 
  userCount, 
  roomUsers = [], 
  boardTitle = 'Untitled Board', 
  onTitleChange, 
  roomId = 'default',
  onExportPNG,
  onExportJSON,
  onImportJSON 
}) {
  const [showCopied, setShowCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef(null);

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url.toString();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput && titleInput.trim() && titleInput.trim() !== boardTitle) {
      onTitleChange?.(titleInput.trim());
    } else {
      setTitleInput(boardTitle);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImportJSON) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onImportJSON(data);
        } catch {
          alert('Invalid .syncdraw project file format.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
      
      {/* Top Left: Logo & Editable Title */}
      <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 pointer-events-auto">
        <div className="w-6 h-6 bg-slate-900 rounded-md shadow-sm flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-sm" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-800 leading-none">SyncDraw</span>
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="text-[11px] text-slate-800 font-medium mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded outline-none border border-indigo-400"
              autoFocus
            />
          ) : (
            <div 
              onClick={() => { setTitleInput(boardTitle); setIsEditingTitle(true); }}
              className="group flex items-center gap-1 cursor-pointer"
              title="Click to rename board"
            >
              <span className="text-[11px] text-slate-600 font-medium mt-0.5 group-hover:text-slate-900">
                {boardTitle}
              </span>
              <Edit2 size={10} className="text-slate-400 group-hover:text-slate-700 mt-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Actions & Live Status */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Live Users Avatar Stack */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-200">
          <div className="flex -space-x-2 mr-1">
            {roomUsers.slice(0, 3).map((u, i) => (
              <div 
                key={i} 
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: u.color || '#6366f1' }}
                title={u.name || `User ${i+1}`}
              >
                {(u.name || 'U').charAt(0).toUpperCase()}
              </div>
            ))}
            {roomUsers.length === 0 && Array.from({ length: Math.min(userCount, 3) }).map((_, i) => (
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
        <button 
          onClick={handleShare}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-lg transition-all text-sm font-medium ${
            showCopied 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
          }`}
        >
          {showCopied ? <Check size={16} /> : <Share size={16} />}
          {showCopied ? 'Link Copied!' : 'Share'}
        </button>

        {/* Export / Import Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center justify-center w-9 h-9 bg-white/90 backdrop-blur-sm hover:bg-slate-50 text-slate-700 rounded-xl shadow-lg border border-slate-200 transition-colors"
            title="Export / Import Board"
          >
            <Download size={18} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
              <button
                onClick={() => { setShowExportMenu(false); onExportPNG?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs font-medium text-slate-700"
              >
                <ImageIcon size={14} className="text-indigo-500" />
                Export PNG (Clean)
              </button>
              <button
                onClick={() => { setShowExportMenu(false); onExportJSON?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs font-medium text-slate-700"
              >
                <FileJson size={14} className="text-emerald-500" />
                Save Project (.syncdraw)
              </button>
              <div className="my-1 h-px bg-slate-100" />
              <button
                onClick={() => { setShowExportMenu(false); fileInputRef.current?.click(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-xs font-medium text-slate-700"
              >
                <FolderOpen size={14} className="text-amber-500" />
                Open Project File...
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".syncdraw,.json" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

