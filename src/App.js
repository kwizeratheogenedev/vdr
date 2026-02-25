import React, { useState, useEffect, Component } from 'react';
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
        <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4">
          <div className="bg-[#252526] rounded-lg p-6 max-w-md w-full text-center border border-[#3e3e3e]">
            <div className="text-red-500 text-6xl mb-4">!</div>
            <h1 className="text-white text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-4">An error occurred in the application.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
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

// Icon Components
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
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  OpenFolder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Completed: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  History: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Title Bar Component
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
        // Handler not available yet, ignore
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
      // Ignore
    }
  };

  const handleMaximize = async () => {
    try {
      if (window.electronAPI?.windowMaximize) {
        await window.electronAPI.windowMaximize();
        setIsMaximized(!isMaximized);
      }
    } catch (error) {
      // Ignore
    }
  };

  const handleClose = async () => {
    try {
      if (window.electronAPI?.windowClose) {
        await window.electronAPI.windowClose();
      }
    } catch (error) {
      // Ignore
    }
  };

  return (
    <div className="title-bar">
      <div className="title-bar-title">
        <svg className="w-4 h-4 text-[#0078d4]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>VDR Video Downloader</span>
      </div>
      <div className="title-bar-controls">
        <button className="title-bar-button" onClick={handleMinimize} title="Minimize">
          <Icons.Minimize />
        </button>
        <button className="title-bar-button" onClick={handleMaximize} title="Maximize">
          <Icons.Maximize />
        </button>
        <button className="title-bar-button close" onClick={handleClose} title="Close">
          <Icons.Close />
        </button>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ activeTab, setActiveTab, activeDownloadsCount }) {
  const tabs = [
    { id: 'downloads', icon: Icons.Download, label: 'Downloads' },
    { id: 'history', icon: Icons.History, label: 'History' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
  ];

  return (
    <div className="sidebar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          title={tab.label}
        >
          <tab.icon />
          {tab.id === 'downloads' && activeDownloadsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#0078d4] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
              {activeDownloadsCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Download Card Component
function DownloadCard({ download, onCancel, onOpenFolder, onOpenFile, onPause, onResume }) {
  const isCompleted = download.completed;
  const isPaused = download.paused;
  const progress = download.progress || 0;

  return (
    <div className="download-card">
      <div className="download-card-header">
        <div className="download-thumbnail flex items-center justify-center">
          {download.thumbnail ? (
            <img src={download.thumbnail} alt="" className="w-full h-full object-cover rounded" />
          ) : (
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="download-info">
          <div className="download-title">{download.title || 'Downloading...'}</div>
          <div className="download-meta">
            <span className={`download-status ${isCompleted ? 'completed' : isPaused ? 'paused' : 'downloading'}`}>
              {isCompleted ? 'Completed' : isPaused ? 'Paused' : 'Downloading'}
            </span>
            {download.speed && <span>Speed: {download.speed}</span>}
            {download.eta && !isCompleted && <span>ETA: {download.eta}</span>}
          </div>
        </div>
      </div>

      <div className="progress-container">
        <div className="flex items-center gap-2">
          <div className="progress-bar flex-1">
            <div 
              className={`progress-fill ${isCompleted ? 'completed' : ''}`} 
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Action buttons on the right side of progress bar */}
          {!isCompleted && (
            <button 
              className="download-action-btn text-red-400 hover:text-red-300 p-1" 
              onClick={() => onCancel(download.id)}
              title="Cancel"
            >
              <Icons.Close />
            </button>
          )}
          {!isCompleted && (
            isPaused ? (
              <button
                className="download-action-btn text-yellow-400 hover:text-yellow-300 p-1"
                onClick={() => onResume && onResume(download.id)}
                title="Resume"
              >
                <Icons.Play />
              </button>
            ) : (
              <button
                className="download-action-btn text-yellow-400 hover:text-yellow-300 p-1"
                onClick={() => onPause && onPause(download.id)}
                title="Pause"
              >
                <Icons.Pause />
              </button>
            )
          )}
          {isCompleted && download.filePath && (
            <button 
              className="download-action-btn text-green-400 hover:text-green-300 p-1" 
              onClick={() => onOpenFile(download.filePath)}
              title="Open file location"
            >
              <Icons.OpenFolder />
            </button>
          )}
        </div>
        <div className="progress-stats">
          <span>{progress.toFixed(1)}%</span>
          <span>
            {download.downloadedSize ? `${download.downloadedSize}` : ''}
            {download.totalSize ? ` / ${download.totalSize}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
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
  const [isElectron, setIsElectron] = useState(false);
  const [activeTab, setActiveTab] = useState('downloads');
  const [isUrlInputFocused, setIsUrlInputFocused] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.electronAPI);
    
    if (window.electronAPI) {
      checkYtDlpInstallation();
      updateActiveDownloads();
      // Get default download folder on startup
      getDefaultDownloadFolder();
    }
    
    if (window.electronAPI) {
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

  const checkYtDlpInstallation = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkYtDlp();
      setYtDlpInstalled(result.success);
      if (!result.success) {
        setMessage({ type: 'error', text: 'yt-dlp is not installed. Please install it first: pip install yt-dlp' });
      }
    }
  };

  const SUPPORTED_PLATFORMS = [
    'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv',
    'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'instagram.com',
    'tiktok.com', 'reddit.com', 'streamable.com', 'ok.ru', 'vk.com',
    'bilibili.com', 'soundcloud.com', 'bandcamp.com', 'nicovideo.jp'
  ];

  // Add support for additional hosts such as MediaFire
  SUPPORTED_PLATFORMS.push('mediafire.com');

  const isValidVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
      const hostname = urlObj.hostname.toLowerCase();
      return SUPPORTED_PLATFORMS.some(platform => 
        hostname === platform || hostname.endsWith('.' + platform)
      );
    } catch {
      return false;
    }
  };

  const updateActiveDownloads = async () => {
    if (window.electronAPI) {
      await window.electronAPI.getActiveDownloads();
    }
  };

  const updateDownloadProgress = (data) => {
    setActiveDownloads(prev => {
      const newDownloads = new Map(prev);
      
      if (data.downloadId) {
        // Handle paused/resumed notifications specifically
        if (data.paused !== undefined) {
          const download = newDownloads.get(data.downloadId) || {
            id: data.downloadId,
            title: data.title || 'Downloading...',
            progress: data.progress || 0,
            speed: data.speed || '0',
            eta: data.eta || 'Calculating...'
          };
          newDownloads.set(data.downloadId, { ...download, paused: !!data.paused });
          return newDownloads;
        }

        if (data.completed) {
          const download = newDownloads.get(data.downloadId);
          newDownloads.delete(data.downloadId);
          
          const completedDownload = download || {
            id: data.downloadId,
            title: data.title || 'Downloaded Video',
            progress: 100,
            speed: '0',
            eta: 'Done'
          };
          
          setCompletedDownloads(prev => {
            const completed = new Map(prev);
            completed.set(data.downloadId, {
              ...completedDownload,
              completed: true,
              filePath: data.filePath,
              completedAt: new Date()
            });
            return completed;
          });
          
          showMessage('success', 'Download completed!');
        } else if (data.failed) {
          newDownloads.delete(data.downloadId);
          showMessage('error', data.error || 'Download failed');
        } else if (data.cancelled) {
          newDownloads.delete(data.downloadId);
          showMessage('info', 'Download cancelled');
        } else {
          const download = newDownloads.get(data.downloadId) || {
            id: data.downloadId,
            title: data.title || 'Downloading...',
            progress: 0,
            speed: '0',
            eta: 'Calculating...'
          };
          
          newDownloads.set(data.downloadId, {
            ...download,
            title: data.title || download.title,
            progress: data.progress || 0,
            speed: data.speed || '0',
            eta: data.eta || 'Calculating...'
          });
        }
      }
      
      return newDownloads;
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
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
      showMessage('error', 'Please enter a valid video URL from a supported platform');
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

    // Check if this video is already being downloaded
    const isAlreadyDownloading = Array.from(activeDownloads.values()).some(
      download => download.url === videoUrlToDownload
    );
    
    if (isAlreadyDownloading) {
      showMessage('error', 'This video is already being downloaded');
      return;
    }

    // Check if video was already downloaded (check history)
    if (window.electronAPI?.checkDownloadHistory) {
      const historyCheck = await window.electronAPI.checkDownloadHistory(videoUrlToDownload);
      if (historyCheck.exists) {
        showMessage('error', 'This video already exists in your downloads');
        if (historyCheck.filePath) {
          const openExisting = window.confirm('This video already exists. Open file location?');
          if (openExisting) {
            await window.electronAPI.openFileLocation(historyCheck.filePath);
          }
        }
        return;
      }
    }

    try {
      const result = await window.electronAPI.downloadVideo({
        url: videoUrlToDownload,
        format: selectedFormat,
        quality: downloadQuality,
        outputPath: downloadFolder,
        networkQuality,
        videoInfo
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
        
        showMessage('success', 'Download started');
        setVideoInfo(null);
        setVideoUrl('');
      } else if (result.alreadyExists) {
        showMessage('error', 'This video already exists in your downloads');
        if (result.filePath) {
          const openExisting = window.confirm('This video already exists. Open file location?');
          if (openExisting) {
            await window.electronAPI.openFileLocation(result.filePath);
          }
        }
      } else {
        showMessage('error', result.error || 'Download failed');
      }
    } catch (error) {
      showMessage('error', 'An error occurred during download');
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

  const activeDownloadsCount = activeDownloads.size;

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          activeDownloadsCount={activeDownloadsCount}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="header-bar">
            <h2 className="header-title">
              {activeTab === 'downloads' && 'Downloads'}
              {activeTab === 'history' && 'History'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
            {downloadFolder && (
              <button 
                className="toolbar-button"
                onClick={openDownloadFolder}
                title="Open download folder"
              >
                <Icons.OpenFolder />
                <span>Open Folder</span>
              </button>
            )}
          </div>

          {/* URL Input Bar - Only show on downloads tab */}
          {activeTab === 'downloads' && (
            <div className="url-input-container">
              <div className={`flex-1 flex items-center bg-[#3c3c3c] border rounded ${isUrlInputFocused ? 'border-[#0078d4]' : 'border-[#3e3e3e]'}`}>
                <Icons.Link />
                <input
                  type="url"
                  className="url-input border-none"
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
                disabled={isLoading || !ytDlpInstalled}
                className="btn btn-primary"
              >
                {isLoading ? 'Loading...' : 'Get Info'}
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4">
            {/* Message Toast */}
            {message.text && (
              <div className={`fixed top-12 right-4 px-4 py-2 rounded shadow-lg z-50 ${
                message.type === 'error' ? 'bg-red-600' : 
                message.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
              } text-white text-sm`}>
                {message.text}
              </div>
            )}

            {/* yt-dlp Warning */}
            {!ytDlpInstalled && (
              <div className="panel mb-4">
                <div className="p-4 text-red-400">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.Info />
                    <span className="font-medium">yt-dlp not found</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Please install yt-dlp: <code className="bg-[#1e1e1e] px-2 py-1 rounded">pip install yt-dlp</code>
                  </p>
                </div>
              </div>
            )}

            {/* Downloads Tab */}
            {activeTab === 'downloads' && (
              <div className="space-y-4">
                {/* Video Info Panel */}
                {videoInfo && (
                  <div className="panel mb-4">
                    <div className="panel-header">
                      <span className="panel-title">Video Information</span>
                    </div>
                    <div className="panel-body">
                      <div className="flex gap-4">
                        {videoInfo.thumbnail && (
                          <img 
                            src={videoInfo.thumbnail} 
                            alt="" 
                            className="w-32 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">{videoInfo.title}</h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {videoInfo.uploader && `By ${videoInfo.uploader}`}
                            {videoInfo.duration && ` · ${formatDuration(videoInfo.duration)}`}
                          </p>
                          
                          {/* Format Selection */}
                          {videoInfo.formats && videoInfo.formats.length > 0 && (
                            <div className="mb-3">
                              <label className="text-xs text-gray-500 block mb-1">Quality</label>
                              <select 
                                className="select"
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
                                    <option key={format.format_id} value={format.format_id}>
                                      {format.height}p {format.ext} {format.filesize ? `(${formatFileSize(format.filesize)})` : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          <button 
                            className="btn btn-primary"
                            onClick={downloadVideo}
                          >
                            <Icons.Download />
                            <span className="ml-2">Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Downloads */}
                {activeDownloads.size > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-400">
                        Active Downloads ({activeDownloads.size})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {Array.from(activeDownloads.values()).map(download => (
                        <DownloadCard
                          key={download.id}
                          download={download}
                          onCancel={cancelDownload}
                          onOpenFile={openFileLocation}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Downloads */}
                {completedDownloads.size > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-400">
                        Completed ({completedDownloads.size})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {Array.from(completedDownloads.values()).map(download => (
                        <DownloadCard
                          key={download.id}
                          download={download}
                          onCancel={cancelDownload}
                          onOpenFile={openFileLocation}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {activeDownloads.size === 0 && completedDownloads.size === 0 && !videoInfo && (
                  <div className="empty-state">
                    <Icons.Download />
                    <div className="empty-state-icon">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <p className="empty-state-text">Paste a video URL above to start downloading</p>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {completedDownloads.size > 0 ? (
                  Array.from(completedDownloads.values()).map(download => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onCancel={cancelDownload}
                      onOpenFile={openFileLocation}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <Icons.History />
                    <div className="empty-state-icon">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="empty-state-text">No download history yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-lg mx-auto">
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Download Settings</span>
                  </div>
                  <div className="panel-body space-y-4">
                    {/* Download Folder */}
                    <div className="settings-group">
                      <label className="settings-label">Download Folder</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input-field flex-1"
                          placeholder="Select download folder..."
                          value={downloadFolder}
                          readOnly
                        />
                        <button className="btn btn-secondary" onClick={selectDownloadFolder}>
                          Browse
                        </button>
                      </div>
                    </div>

                    {/* Network Quality */}
                    <div className="settings-group">
                      <label className="settings-label">Network Quality</label>
                      <select 
                        className="select w-full"
                        value={networkQuality}
                        onChange={(e) => setNetworkQuality(e.target.value)}
                      >
                        <option value="fast">Fast (Fiber, Ethernet)</option>
                        <option value="medium">Medium (DSL, 4G)</option>
                        <option value="slow">Slow (3G, Weak WiFi)</option>
                      </select>
                    </div>

                    {/* Download Quality */}
                    <div className="settings-group">
                      <label className="settings-label">Preferred Quality</label>
                      <select 
                        className="select w-full"
                        value={downloadQuality}
                        onChange={(e) => setDownloadQuality(e.target.value)}
                      >
                        <option value="best">Best Available</option>
                        <option value="1080">1080p</option>
                        <option value="720">720p</option>
                        <option value="480">480p</option>
                        <option value="360">360p</option>
                      </select>
                    </div>

                    {/* About */}
                    <div className="mt-6 pt-4 border-t border-[#3e3e3e]">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">About</h4>
                      <p className="text-xs text-gray-500">
                        VDR Video Downloader v1.0.0<br />
                        Powered by yt-dlp
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-item">
          {activeDownloads.size > 0 ? `Downloading ${activeDownloads.size} file(s)` : 'Ready'}
        </span>
        <span className="status-item">
          {ytDlpInstalled ? 'yt-dlp: Installed' : 'yt-dlp: Not Found'}
        </span>
      </div>
    </div>
  );
}

// Wrap App with Error Boundary
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
