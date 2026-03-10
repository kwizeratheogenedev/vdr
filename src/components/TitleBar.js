import React, { useState, useEffect } from 'react';
import Icons from './Icons';

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        if (window.electronAPI?.windowIsMaximized) {
          const result = await window.electronAPI.windowIsMaximized();
          setIsMaximized(result);
        }
      } catch (error) {
        // Silent fail
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    try {
      if (window.electronAPI?.windowMinimize) {
        await window.electronAPI.windowMinimize();
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleMaximize = async () => {
    try {
      if (window.electronAPI?.windowMaximize) {
        await window.electronAPI.windowMaximize();
        setIsMaximized(!isMaximized);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleClose = async () => {
    try {
      if (window.electronAPI?.windowClose) {
        await window.electronAPI.windowClose();
      }
    } catch (error) {
      // Silent fail
    }
  };

  return (
    <div className="h-10 bg-gradient-to-r from-slate-950 via-slate-900 to-black backdrop-blur-md flex items-center justify-between px-4 border-b border-white/5 select-none" style={{ WebkitAppRegion: 'drag' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center border border-blue-500/30">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <span className="text-white/90 font-semibold text-sm tracking-wide">VDR Video Downloader</span>
      </div>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200" 
          onClick={handleMinimize}
          title="Minimize"
        >
          <Icons.Minimize />
        </button>
        <button 
          className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200" 
          onClick={handleMaximize}
          title="Maximize"
        >
          <Icons.Maximize />
        </button>
        <button 
          className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 rounded-lg transition-all duration-200" 
          onClick={handleClose}
          title="Close"
        >
          <Icons.Close />
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
