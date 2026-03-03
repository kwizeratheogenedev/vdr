import React, { useState, useEffect, useRef, Component } from 'react';
import './index.css';

// Error Boundary component to catch React errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
          <div className="bg-black/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-center border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-white text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-gray-300 mb-6">An unexpected error occurred in the application.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Non-Electron Warning Component
const NonElectronWarning = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
    <div className="bg-black/50 backdrop-blur-xl rounded-3xl p-10 max-w-lg w-full text-center border border-white/10 shadow-2xl">
      <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-white text-3xl font-bold mb-4">Running Outside Electron</h1>
      <p className="text-gray-300 mb-2">
        This application is designed to run in <span className="text-blue-400 font-semibold">Electron</span>, not in a regular web browser.
      </p>
      <p className="text-gray-400 mb-8">To use this app, please run it using Electron:</p>
      <div className="bg-black/40 rounded-xl p-4 text-left mb-8 border border-white/10">
        <code className="text-green-400 font-mono text-sm">npm run electron-dev</code>
      </div>
      <p className="text-gray-500 text-sm">
        Or build and run: <code className="text-gray-400">npm run electron-pack</code>
      </p>
    </div>
  </div>
);

// Beautiful Icons
const Icons = {
  Home: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Minimize: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  ),
  Maximize: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  Link: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  OpenFolder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Video: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Bolt: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Cloud: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  Magnet: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  Rocket: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Globe: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
};

// Title Bar Component with glassmorphism
function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        if (window.electronAPI?.windowIsMaximized) {
          const result = await window.electronAPI.windowIsMaximized();
          setIsMaximized(result);
        }
      } catch (error) {}
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    try {
      if (window.electronAPI?.windowMinimize) {
        await window.electronAPI.windowMinimize();
      }
    } catch (error) {}
  };

  const handleMaximize = async () => {
    try {
      if (window.electronAPI?.windowMaximize) {
        await window.electronAPI.windowMaximize();
        setIsMaximized(!isMaximized);
      }
    } catch (error) {}
  };

  const handleClose = async () => {
    try {
      if (window.electronAPI?.windowClose) {
        await window.electronAPI.windowClose();
      }
    } catch (error) {}
  };

  return (
    <div className="h-10 bg-gradient-to-r from-slate-950 via-slate-900 to-black backdrop-blur-md flex items-center justify-between px-4 border-b border-white/5 select-none" style={{WebkitAppRegion: 'drag'}}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center border border-blue-500/30">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <span className="text-white/90 font-semibold text-sm tracking-wide">VDR Video Downloader</span>
      </div>
      <div className="flex items-center gap-1" style={{WebkitAppRegion: 'no-drag'}}>
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

// Beautiful Sidebar
function Sidebar({ activeTab, setActiveTab, activeDownloadsCount }) {
  const tabs = [
    { id: 'downloads', icon: Icons.Download, label: 'Downloads', gradient: 'from-blue-600 to-blue-800' },
    { id: 'history', icon: Icons.History, label: 'History', gradient: 'from-green-600 to-green-800' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings', gradient: 'from-slate-600 to-slate-800' },
  ];

  return (
    <div className="w-16 bg-gradient-to-b from-slate-950/90 to-black/90 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`relative w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 group ${
            activeTab === tab.id 
              ? `bg-gradient-to-br ${tab.gradient} border border-blue-500/30` 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
          title={tab.label}
        >
          <tab.icon />
          {tab.id === 'downloads' && activeDownloadsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {activeDownloadsCount}
            </span>
          )}
          <span className={`text-[9px] mt-0.5 font-medium ${activeTab === tab.id ? 'text-white' : 'text-white/50'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Animated Progress Bar
function AnimatedProgressBar({ progress, isCompleted, isFailed }) {
  return (
    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          isCompleted 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : isFailed 
              ? 'bg-red-500' 
              : 'bg-gradient-to-r from-blue-600 to-blue-800'
        }`}
        style={{ width: `${isCompleted || isFailed ? 100 : progress}%` }}
      >
        {!isCompleted && !isFailed && (
          <div className="h-full w-full animate-shimmer" style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
        )}
      </div>
    </div>
  );
}

// Beautiful Download Card
function DownloadCard({ download, onCancel, onOpenFile, onPause, onResume, onDelete }) {
  const isCompleted = download.completed;
  const isPaused = download.paused;
  const isFailed = download.failed;
  const progress = download.progress || 0;

  const getStatusColor = () => {
    if (isCompleted) return 'text-green-400';
    if (isFailed) return 'text-red-400';
    if (isPaused) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (isFailed) return 'Failed';
    if (isPaused) return 'Paused';
    return 'Downloading';
  };

  return (
    <div className={`group relative bg-black/40 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:bg-black/50 hover:border-white/10 ${
      isCompleted ? 'border-green-500/30' : isFailed ? 'border-red-500/30' : 'border-white/5'
    }`}>
      <div className="p-3">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="w-16 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 flex items-center justify-center">
            {download.thumbnail ? (
              <img src={download.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icons.Video />
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm truncate mb-1">
              {download.title || (isCompleted ? 'Download Complete' : isFailed ? 'Download Failed' : 'Downloading...')}
            </h4>
            
            <div className="flex items-center gap-3 text-xs">
              <span className={`flex items-center gap-1 ${getStatusColor()}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-400' : isFailed ? 'bg-red-400' : isPaused ? 'bg-yellow-400' : 'bg-blue-400 animate-pulse'}`} />
                {getStatusText()}
              </span>
              {download.speed && !isCompleted && !isFailed && (
                <span className="text-white/50">{download.speed}</span>
              )}
              {download.eta && !isCompleted && !isFailed && (
                <span className="text-white/50 flex items-center gap-1">
                  <Icons.Clock />
                  {download.eta}
                </span>
              )}
            </div>
            
            {/* Progress */}
            <div className="mt-3">
              <AnimatedProgressBar progress={progress} isCompleted={isCompleted} isFailed={isFailed} />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-white/50">{progress.toFixed(1)}%</span>
                {download.totalSize && (
                  <span className="text-xs text-white/50">{download.totalSize}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {!isCompleted && !isFailed && (
              <>
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                  onClick={() => isPaused ? onResume(download.id) : onPause(download.id)}
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? <Icons.Play /> : <Icons.Pause />}
                </button>
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all"
                  onClick={() => onCancel(download.id)}
                  title="Cancel"
                >
                  <Icons.Close />
                </button>
              </>
            )}
            {isCompleted && download.filePath && (
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500/20 text-green-400 hover:text-green-300 hover:bg-green-500/30 transition-all"
                onClick={() => onOpenFile(download.filePath)}
                title="Open file"
              >
                <Icons.OpenFolder />
              </button>
            )}
            {(isCompleted || isFailed) && (
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-all"
                onClick={() => onDelete(download.id)}
                title="Remove"
              >
                <Icons.Trash />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast Notification Component
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBgColor = () => {
    switch (message.type) {
      case 'error': return 'bg-red-500/90 border-red-400/50';
      case 'success': return 'bg-green-500/90 border-green-400/50';
      case 'info': return 'bg-blue-500/90 border-blue-400/50';
      default: return 'bg-purple-500/90 border-purple-400/50';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'error': return <Icons.Close />;
      case 'success': return <Icons.Check />;
      case 'info': return <Icons.Info />;
      default: return <Icons.Sparkles />;
    }
  };

  return (
    <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-2xl animate-slide-in ${getBgColor()}`}>
      <div className="flex items-center gap-3">
        <span className="text-white">{getIcon()}</span>
        <span className="text-white font-medium text-sm">{message.text}</span>
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
          <Icons.Close />
        </button>
      </div>
    </div>
  );
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

// Empty State
function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center mb-3">
        <Icon />
      </div>
      <h3 className="text-sm font-medium text-white mb-1">{title}</h3>
      <p className="text-white/40 text-xs max-w-xs">{subtitle}</p>
    </div>
  );
}

// Main App Component
function App() {
  if (typeof window !== 'undefined' && !window.electronAPI) {
    return <NonElectronWarning />;
  }
  
  const [videoUrl, setVideoUrl] = useState('');
  const [downloadFolder, setDownloadFolder] = useState('');
  const [networkQuality, setNetworkQuality] = useState('medium');
  const [downloadQuality, setDownloadQuality] = useState('best');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [activeDownloads, setActiveDownloads] = useState(new Map());
  const [completedDownloads, setCompletedDownloads] = useState(new Map());
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [ytDlpInstalled, setYtDlpInstalled] = useState(true);
  const [activeTab, setActiveTab] = useState('downloads');
  const [isUrlInputFocused, setIsUrlInputFocused] = useState(false);
  const [settings, setSettings] = useState({
    cookieBrowser: '',
    referer: '',
    userAgent: '',
    customHeaders: ''
  });

  useEffect(() => {
    if (window.electronAPI) {
      checkYtDlpInstallation();
      getDefaultDownloadFolder();
      loadSettings();
      
      const unsubscribe = window.electronAPI.onDownloadProgress((data) => {
        updateDownloadProgress(data);
      });
      
      const unsubscribeSpeed = window.electronAPI.onSpeedOptimization?.((data) => {
        if (data.downloadId) {
          setActiveDownloads(prev => {
            const newDownloads = new Map(prev);
            const download = newDownloads.get(data.downloadId);
            if (download) {
              newDownloads.set(data.downloadId, {
                ...download,
                speed: data.speed,
                downloadedBytes: data.downloadedBytes
              });
            }
            return newDownloads;
          });
        }
      });
      
      return () => {
        if (unsubscribe) unsubscribe();
        if (unsubscribeSpeed) unsubscribeSpeed();
      };
    }
  }, []);

  const getDefaultDownloadFolder = async () => {
    if (window.electronAPI?.getDefaultDownloadFolder) {
      const folder = await window.electronAPI.getDefaultDownloadFolder();
      setDownloadFolder(folder);
    }
  };

  const loadSettings = async () => {
    if (window.electronAPI?.getSettings) {
      const loadedSettings = await window.electronAPI.getSettings();
      if (loadedSettings) {
        setSettings({
          cookieBrowser: loadedSettings.cookieBrowser || '',
          referer: loadedSettings.referer || '',
          userAgent: loadedSettings.userAgent || '',
          customHeaders: loadedSettings.customHeaders || ''
        });
      }
    }
  };

  const updateSettings = async (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    if (window.electronAPI?.updateSettings) {
      await window.electronAPI.updateSettings(updatedSettings);
    }
  };

  const checkYtDlpInstallation = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkYtDlp();
      setYtDlpInstalled(result.success);
      if (!result.success) {
        setMessage({ type: 'error', text: 'yt-dlp is not installed. Please install it: pip install yt-dlp' });
      }
    }
  };

  const isValidVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmedUrl = url.trim().toLowerCase();
    if (trimmedUrl.startsWith('magnet:')) return true;
    if (trimmedUrl.startsWith('torrent:') || trimmedUrl.endsWith('.torrent')) return true;
    try {
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      const urlObj = new URL(cleanUrl);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch (e) {
      return false;
    }
  };

  const updateDownloadProgress = (data) => {
    setActiveDownloads(prev => {
      const newDownloads = new Map(prev);
      
      if (data.completed || data.failed) {
        const download = newDownloads.get(data.downloadId);
        if (download) {
          newDownloads.set(data.downloadId, {
            ...download,
            completed: data.completed,
            failed: data.failed,
            progress: 100,
            filePath: data.filePath,
            error: data.error
          });
          
          if (data.completed) {
            setTimeout(() => {
              setCompletedDownloads(prev => {
                const completed = new Map(prev);
                completed.set(data.downloadId, {
                  ...download,
                  completed: true,
                  progress: 100,
                  filePath: data.filePath
                });
                return completed;
              });
              newDownloads.delete(data.downloadId);
            }, 2000);
          }
        }
      } else if (data.downloadId) {
        const existing = newDownloads.get(data.downloadId);
        if (existing) {
          newDownloads.set(data.downloadId, {
            ...existing,
            progress: data.progress || existing.progress,
            speed: data.speed || existing.speed,
            eta: data.eta || existing.eta,
            downloadedSize: data.downloadedSize,
            totalSize: data.totalSize,
            paused: data.paused
          });
        }
      }
      
      return newDownloads;
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const selectDownloadFolder = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectDownloadFolder();
    if (result.success) {
      setDownloadFolder(result.folderPath);
    } else {
      showMessage('error', result.error || 'Failed to select folder');
    }
  };

  const fetchVideoInfo = async () => {
    if (!videoUrl.trim()) {
      showMessage('error', 'Please enter a video URL');
      return;
    }

    if (!isValidVideoUrl(videoUrl.trim())) {
      showMessage('error', 'Please enter a valid URL');
      return;
    }

    if (!window.electronAPI) return;

    setIsLoading(true);
    setVideoInfo(null);
    setSelectedFormat(null);

    try {
      const result = await window.electronAPI.getVideoInfo(videoUrl);
      
      if (result.success) {
        setVideoInfo(result.info);
        if (result.info.formats && result.info.formats.length > 0) {
          const bestFormat = result.info.formats
            .filter(f => f.vcodec !== 'none' && f.height)
            .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
          setSelectedFormat(bestFormat);
        }
      } else {
        showMessage('error', result.error || 'Failed to fetch video information');
      }
    } catch (error) {
      showMessage('error', 'An error occurred while fetching video info');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!videoInfo) {
      showMessage('error', 'Please fetch video information first');
      return;
    }

    const videoUrlToDownload = videoInfo.webpage_url || videoUrl;

    const isAlreadyDownloading = Array.from(activeDownloads.values()).some(
      download => download.url === videoUrlToDownload
    );
    
    if (isAlreadyDownloading) {
      showMessage('error', 'This video is already being downloaded');
      return;
    }

    // Check if video was previously downloaded
    let wasPreviouslyDownloaded = false;
    
    if (window.electronAPI?.checkDownloadHistory) {
      const historyCheck = await window.electronAPI.checkDownloadHistory(videoUrlToDownload);
      if (historyCheck.exists) {
        wasPreviouslyDownloaded = true;
        // Show info message about re-download
        showMessage('info', 'This video was previously downloaded. Starting re-download...');
      }
    }

    // Check if user wants to re-download an already downloaded video
    const forceDownload = wasPreviouslyDownloaded;
    
    try {
      const result = await window.electronAPI.downloadVideo({
        url: videoUrlToDownload,
        format: selectedFormat,
        quality: downloadQuality,
        outputPath: downloadFolder,
        networkQuality,
        videoInfo,
        force: forceDownload // Pass force flag to allow re-download
      });

      if (result.success) {
        setActiveDownloads(prev => {
          const newDownloads = new Map(prev);
          newDownloads.set(result.downloadId, {
            id: result.downloadId,
            title: videoInfo.title || 'Downloading...',
            url: videoUrlToDownload,
            progress: 0,
            speed: '0',
            eta: 'Calculating...',
            thumbnail: videoInfo.thumbnail
          });
          return newDownloads;
        });
        
        showMessage('success', 'Download started!');
        setVideoInfo(null);
        setVideoUrl('');
      } else {
        showMessage('error', result.error || 'Download failed');
      }
    } catch (error) {
      showMessage('error', 'An error occurred during download');
    }
  };

  const handleQuickDownload = async () => {
    const url = videoUrl.trim();
    if (!url || !isValidVideoUrl(url)) {
      showMessage('error', 'Please enter a valid URL');
      return;
    }

    const isAlreadyDownloading = Array.from(activeDownloads.values()).some(
      download => download.url === url
    );
    
    if (isAlreadyDownloading) {
      showMessage('error', 'This file is already being downloaded');
      return;
    }

    const lowerUrl = url.toLowerCase();
    const isMagnet = lowerUrl.startsWith('magnet:');
    const isTorrent = lowerUrl.startsWith('torrent:') || lowerUrl.endsWith('.torrent');

    if (isMagnet || isTorrent) {
      showMessage('info', 'Starting torrent download...');
      try {
        const result = await window.electronAPI.downloadTorrent({
          url: url,
          outputPath: downloadFolder
        });
        
        if (result.success) {
          setActiveDownloads(prev => {
            const newDownloads = new Map(prev);
            newDownloads.set(result.downloadId, {
              id: result.downloadId,
              title: 'Torrent Download',
              url: url,
              progress: 0
            });
            return newDownloads;
          });
          showMessage('success', 'Torrent download started!');
        } else {
          showMessage('error', result.error || 'Failed to start torrent download');
        }
      } catch (error) {
        showMessage('error', error.message || 'Failed to start torrent download');
      }
    } else {
      showMessage('info', 'Starting download...');
      try {
        const result = await window.electronAPI.directDownload({
          url: url,
          outputPath: downloadFolder,
          networkQuality,
          cookieBrowser: settings.cookieBrowser,
          referer: settings.referer,
          userAgent: settings.userAgent,
          customHeaders: settings.customHeaders
        });
        
        if (result.success) {
          setActiveDownloads(prev => {
            const newDownloads = new Map(prev);
            newDownloads.set(result.downloadId, {
              id: result.downloadId,
              title: result.title || 'Direct Download',
              url: url,
              progress: 0,
              speed: '0',
              eta: 'Calculating...'
            });
            return newDownloads;
          });
          showMessage('success', 'Download started!');
          setVideoUrl('');
        } else {
          showMessage('error', result.error || 'Failed to start download');
        }
      } catch (error) {
        showMessage('error', error.message || 'Failed to start download');
      }
    }
  };

  const cancelDownload = async (downloadId) => {
    if (!window.electronAPI) return;
    
    try {
      const result = await window.electronAPI.cancelDownload(downloadId);
      
      if (result.success || result.error === 'Download not found') {
        setActiveDownloads(prev => {
          const newDownloads = new Map(prev);
          newDownloads.delete(downloadId);
          return newDownloads;
        });
        showMessage('info', 'Download cancelled');
      } else {
        showMessage('error', result.error || 'Failed to cancel download');
      }
    } catch (error) {
      showMessage('error', 'Failed to cancel download');
    }
  };

  const removeFromList = (downloadId) => {
    setActiveDownloads(prev => {
      const newDownloads = new Map(prev);
      newDownloads.delete(downloadId);
      return newDownloads;
    });
    setCompletedDownloads(prev => {
      const newDownloads = new Map(prev);
      newDownloads.delete(downloadId);
      return newDownloads;
    });
  };

  const pauseDownload = async (downloadId) => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.pauseDownload(downloadId);
      if (result.success) {
        setActiveDownloads(prev => {
          const newDownloads = new Map(prev);
          const d = newDownloads.get(downloadId);
          if (d) newDownloads.set(downloadId, { ...d, paused: true });
          return newDownloads;
        });
        showMessage('info', 'Download paused');
      } else {
        showMessage('error', result.error || 'Failed to pause download');
      }
    } catch (error) {
      showMessage('error', 'Failed to pause download');
    }
  };

  const resumeDownload = async (downloadId) => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.resumeDownload(downloadId);
      if (result.success) {
        setActiveDownloads(prev => {
          const newDownloads = new Map(prev);
          const d = newDownloads.get(downloadId);
          if (d) newDownloads.set(downloadId, { ...d, paused: false });
          return newDownloads;
        });
        showMessage('success', 'Download resumed');
      } else {
        showMessage('error', result.error || 'Failed to resume download');
      }
    } catch (error) {
      showMessage('error', 'Failed to resume download');
    }
  };

  const openFileLocation = async (filePath) => {
    if (!window.electronAPI) return;
    await window.electronAPI.openFileLocation(filePath);
  };

  const openDownloadFolder = async () => {
    if (!window.electronAPI || !downloadFolder) return;
    await window.electronAPI.openDownloadFolder(downloadFolder);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getTabTitle = () => {
    switch(activeTab) {
      case 'downloads': return 'Downloads';
      case 'history': return 'Download History';
      case 'settings': return 'Settings';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900/30 to-black">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          activeDownloadsCount={activeDownloads.size}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-12 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-3">
              <span className="text-blue-400">
                {getTabTitle()}
              </span>
            </h2>
            {downloadFolder && (
              <button 
                onClick={openDownloadFolder}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white/80 hover:text-white rounded-lg transition-all duration-200 border border-white/10 text-xs"
              >
                <Icons.Folder />
                <span>Open</span>
              </button>
            )}
          </div>

          {/* URL Input Area - Downloads Tab */}
          {activeTab === 'downloads' && (
            <div className="px-6 py-4 bg-black/40 border-b border-white/10">
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center bg-black/50 backdrop-blur-sm border rounded-2xl px-4 transition-all duration-300 ${
                  isUrlInputFocused 
                    ? 'border-blue-500/50 bg-black/60 shadow-lg shadow-blue-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}>
                  <Icons.Globe className="text-white/40" />
                  <input
                    type="url"
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 px-3 py-3"
                    placeholder="Paste video URL here (YouTube, Vimeo, TikTok, etc.)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchVideoInfo()}
                    onFocus={() => setIsUrlInputFocused(true)}
                    onBlur={() => setIsUrlInputFocused(false)}
                    disabled={!ytDlpInstalled}
                  />
                </div>
                
                <button
                  onClick={fetchVideoInfo}
                  disabled={isLoading || !ytDlpInstalled || !videoUrl.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 disabled:from-gray-800 disabled:to-gray-900 text-white rounded-xl font-medium transition-all duration-300 border border-blue-500/30 flex items-center gap-2"
                >
                  {isLoading ? <LoadingSpinner /> : <><Icons.Search /> <span>Get Info</span></>}
                </button>
                
                <button
                  onClick={handleQuickDownload}
                  disabled={!videoUrl.trim()}
                  className="px-5 py-3 bg-black/50 hover:bg-black/70 text-white rounded-xl font-medium transition-all duration-300 border border-white/10 flex items-center gap-2"
                  title="Quick download any file"
                >
                  <Icons.Bolt />
                  <span>Quick</span>
                </button>
                
                <button
                  onClick={handleQuickDownload}
                  disabled={!videoUrl.trim()}
                  className="px-5 py-3 bg-black/50 hover:bg-black/70 text-white rounded-xl font-medium transition-all duration-300 border border-white/10 flex items-center gap-2"
                  title="Download torrents"
                >
                  <Icons.Magnet />
                  <span>Torrent</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-3">
            {message.text && (
              <Toast message={message} onClose={() => setMessage({ type: '', text: '' })} />
            )}

            {/* yt-dlp Warning */}
            {!ytDlpInstalled && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <Icons.Info />
                  <span className="font-medium">yt-dlp not found - pip install yt-dlp</span>
                </div>
              </div>
            )}

            {/* Downloads Tab */}
            {activeTab === 'downloads' && (
              <div className="space-y-6">
                {/* Video Info Panel */}
                {videoInfo && (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-3 py-2 bg-black/50 border-b border-white/5">
                      <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                        <Icons.Video />
                        Video Information
                      </h3>
                    </div>
                    <div className="p-3">
                      <div className="flex gap-3">
                        {videoInfo.thumbnail && (
                          <div className="w-28 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                            <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">{videoInfo.title}</h4>
                          <p className="text-white/50 text-xs mb-2">
                            {videoInfo.uploader && <span>By {videoInfo.uploader}</span>}
                            {videoInfo.duration && <span className="mx-1">·</span>}
                            {videoInfo.duration && <span>{formatDuration(videoInfo.duration)}</span>}
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            <select 
                              className="bg-black/50 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                              value={selectedFormat?.format_id || ''}
                              onChange={(e) => {
                                const format = videoInfo.formats.find(f => f.format_id === e.target.value);
                                setSelectedFormat(format);
                              }}
                            >
                              {videoInfo.formats
                                .filter(f => f.vcodec !== 'none' && f.height)
                                .sort((a, b) => (b.height || 0) - (a.height || 0))
                                .slice(0, 10)
                                .map(format => (
                                  <option key={format.format_id} value={format.format_id} className="bg-slate-800">
                                    {format.height}p {format.ext}
                                  </option>
                                ))}
                            </select>

                            <button 
                              onClick={downloadVideo}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-1.5 text-xs"
                            >
                              <Icons.Download />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Downloads */}
                {activeDownloads.size > 0 && (
                  <div>
                    <h3 className="text-white/60 text-xs font-medium mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      Active ({activeDownloads.size})
                    </h3>
                    <div className="space-y-2">
                      {Array.from(activeDownloads.values()).map(download => (
                        <DownloadCard
                          key={download.id}
                          download={download}
                          onCancel={cancelDownload}
                          onOpenFile={openFileLocation}
                          onPause={pauseDownload}
                          onResume={resumeDownload}
                          onDelete={removeFromList}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Downloads */}
                {completedDownloads.size > 0 && (
                  <div className="mt-4">
                    <h3 className="text-white/60 text-xs font-medium mb-2 flex items-center gap-2">
                      <Icons.Check />
                      Completed ({completedDownloads.size})
                    </h3>
                    <div className="space-y-2">
                      {Array.from(completedDownloads.values()).map(download => (
                        <DownloadCard
                          key={download.id}
                          download={download}
                          onCancel={cancelDownload}
                          onOpenFile={openFileLocation}
                          onPause={pauseDownload}
                          onResume={resumeDownload}
                          onDelete={removeFromList}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {activeDownloads.size === 0 && completedDownloads.size === 0 && !videoInfo && (
                  <EmptyState 
                    icon={Icons.Rocket}
                    title="Ready to Download"
                    subtitle="Paste a video URL above to start downloading."
                  />
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {completedDownloads.size > 0 ? (
                  Array.from(completedDownloads.values()).map(download => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onCancel={cancelDownload}
                      onOpenFile={openFileLocation}
                      onPause={pauseDownload}
                      onResume={resumeDownload}
                      onDelete={removeFromList}
                    />
                  ))
                ) : (
                  <EmptyState 
                    icon={Icons.History}
                    title="No Download History"
                    subtitle="Your completed downloads will appear here."
                  />
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl space-y-6">
                {/* General Settings */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-3 py-2 bg-black/50 border-b border-white/5">
                    <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                      <Icons.Settings />
                      General Settings
                    </h3>
                  </div>
                  <div className="p-3 space-y-4">
                    {/* Download Folder */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5">Download Location</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                          value={downloadFolder}
                          readOnly
                        />
                        <button
                          onClick={selectDownloadFolder}
                          className="px-3 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg border border-white/10 transition-all text-xs"
                        >
                          Browse
                        </button>
                      </div>
                    </div>

                    {/* Network Quality */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5 flex items-center gap-2">
                        <Icons.Bolt />
                        Network Quality
                      </label>
                      <select 
                        className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                        value={networkQuality}
                        onChange={(e) => setNetworkQuality(e.target.value)}
                      >
                        <option value="fast" className="bg-slate-800">🚀 Fast (Fiber, Ethernet)</option>
                        <option value="medium" className="bg-slate-800">📶 Medium (DSL, 4G)</option>
                        <option value="slow" className="bg-slate-800">🐢 Slow (3G, Weak WiFi)</option>
                      </select>
                    </div>

                    {/* Download Quality */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5 flex items-center gap-2">
                        <Icons.Star />
                        Preferred Quality
                      </label>
                      <select 
                        className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                        value={downloadQuality}
                        onChange={(e) => setDownloadQuality(e.target.value)}
                      >
                        <option value="best" className="bg-slate-800">⭐ Best Available</option>
                        <option value="1080" className="bg-slate-800">1080p Full HD</option>
                        <option value="720" className="bg-slate-800">720p HD</option>
                        <option value="480" className="bg-slate-800">480p SD</option>
                        <option value="360" className="bg-slate-800">360p Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-3 py-2 bg-black/50 border-b border-white/5">
                    <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                      <Icons.Shield />
                      Advanced (Protected Sites)
                    </h3>
                  </div>
                  <div className="p-3 space-y-4">
                    <p className="text-white/50 text-xs">
                      Use these settings for protected streaming sites like Wootly, Netflix, etc.
                    </p>

                    {/* Cookie Browser */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5">Browser Cookies</label>
                      <select 
                        className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"
                        value={settings.cookieBrowser || ''}
                        onChange={(e) => updateSettings({ cookieBrowser: e.target.value })}
                      >
                        <option value="" className="bg-slate-800">None (public content)</option>
                        <option value="chrome" className="bg-slate-800">Google Chrome</option>
                        <option value="firefox" className="bg-slate-800">Mozilla Firefox</option>
                        <option value="edge" className="bg-slate-800">Microsoft Edge</option>
                        <option value="opera" className="bg-slate-800">Opera</option>
                        <option value="brave" className="bg-slate-800">Brave</option>
                      </select>
                    </div>

                    {/* Referer URL */}
                    <div>
                      <label className="text-white/70 text-sm font-medium block mb-2">Referer URL</label>
                      <input
                        type="text"
                        className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500 placeholder-white/30"
                        placeholder="https://example.com"
                        value={settings.referer || ''}
                        onChange={(e) => updateSettings({ referer: e.target.value })}
                      />
                    </div>

                    {/* Custom User-Agent */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5">Custom User-Agent</label>
                      <input
                        type="text"
                        className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 placeholder-white/30"
                        placeholder="Mozilla/5.0 ..."
                        value={settings.userAgent || ''}
                        onChange={(e) => updateSettings({ userAgent: e.target.value })}
                      />
                    </div>

                    {/* Custom Headers */}
                    <div>
                      <label className="text-white/70 text-xs font-medium block mb-1.5">Custom Headers</label>
                      <input
                        type="text"
                        className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 placeholder-white/30"
                        placeholder="Header1: Value1"
                        value={settings.customHeaders || ''}
                        onChange={(e) => updateSettings({ customHeaders: e.target.value })}
                      />
                    </div>

                    {/* Clear Download History */}
                    <button
                      onClick={async () => {
                        if (window.electronAPI?.clearDownloadHistory) {
                          await window.electronAPI.clearDownloadHistory();
                          showMessage('success', 'Download history cleared');
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all text-xs"
                    >
                      Clear Download History
                    </button>
                  </div>
                </div>

                {/* About */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center border border-blue-500/30">
                      <Icons.Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">VDR Video Downloader</h4>
                      <p className="text-white/40 text-xs">Version 1.0.0 • Powered by yt-dlp</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 text-xs">
        <span className="text-white/50 flex items-center gap-2">
          {activeDownloads.size > 0 ? (
            <>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Downloading {activeDownloads.size} file(s)
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              Ready
            </>
          )}
        </span>
        <span className={`flex items-center gap-2 ${ytDlpInstalled ? 'text-green-400' : 'text-red-400'}`}>
          <Icons.Check />
          yt-dlp: {ytDlpInstalled ? 'Installed' : 'Not Found'}
        </span>
      </div>
    </div>
  );
}

// Add custom styles for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-shimmer {
    animation: shimmer 1.5s infinite;
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(style);

// Wrap App with Error Boundary
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
