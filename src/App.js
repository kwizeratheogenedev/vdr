import React, { useState, useEffect } from 'react';
import './index.css';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import NonElectronWarning from './components/NonElectronWarning';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import DownloadCard from './components/DownloadCard';
import Toast from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import EmptyState from './components/EmptyState';
import Icons from './components/Icons';

// Custom hooks
import { useDownloadProgress } from './hooks/useDownloadProgress';
import { useSettings } from './hooks/useSettings';

// Main App Component
function App() {
  // Always call hooks first, before any early returns
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
  const [isElectron, setIsElectron] = useState(false);
  const [selectedDownload, setSelectedDownload] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [isDefaultDownloadManager, setIsDefaultDownloadManager] = useState(null);
  const [hideDefaultManagerPrompt, setHideDefaultManagerPrompt] = useState(false);
  const [isPackaged, setIsPackaged] = useState(null);
  
  const { settings, updateSettings, loadSettings } = useSettings();
  
  useDownloadProgress({
    setActiveDownloads,
    setCompletedDownloads
  });

  // Sync selectedDownload with active/completed downloads to keep it up to date
  useEffect(() => {
    if (!selectedDownload) return;
    
    const activeDownload = activeDownloads.get(selectedDownload.id);
    const completedDownload = completedDownloads.get(selectedDownload.id);
    
    if (activeDownload) {
      setSelectedDownload(activeDownload);
    } else if (completedDownload) {
      setSelectedDownload(completedDownload);
    } else {
      // Selected download was deleted, clear selection
      setSelectedDownload(null);
    }
  }, [activeDownloads, completedDownloads, selectedDownload]);

  // Auto-select first download when downloads become available
  useEffect(() => {
    const totalDownloads = activeDownloads.size + completedDownloads.size;
    if (totalDownloads > 0 && !selectedDownload) {
      // Auto-select the first active download, or first completed if no active
      if (activeDownloads.size > 0) {
        const firstActive = activeDownloads.values().next().value;
        setSelectedDownload(firstActive);
      } else if (completedDownloads.size > 0) {
        const firstCompleted = completedDownloads.values().next().value;
        setSelectedDownload(firstCompleted);
      }
    }
  }, [activeDownloads, completedDownloads, selectedDownload]);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(!!window.electronAPI);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (isElectron) {
      // Check if still mounted before updating state
      const checkAndSet = (setter, value) => {
        if (isMounted) setter(value);
      };
      
      checkYtDlpInstallation();
      getDefaultDownloadFolder();
      loadSettings();

      if (window.electronAPI?.isDefaultDownloadManager) {
        window.electronAPI.isDefaultDownloadManager().then((result) => {
          checkAndSet(setIsDefaultDownloadManager, result?.isDefault ?? false);
        }).catch(() => {
          checkAndSet(setIsDefaultDownloadManager, false);
        });
      }

      if (window.electronAPI?.isPackaged) {
        window.electronAPI.isPackaged().then((packaged) => {
          checkAndSet(setIsPackaged, packaged);
        }).catch((error) => {
          console.warn('Failed to check if app is packaged:', error);
          checkAndSet(setIsPackaged, false);
        });
      } else {
        checkAndSet(setIsPackaged, false);
      }
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isElectron, loadSettings]);

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
        setMessage({ type: 'error', text: 'yt-dlp is not installed. Please install it: pip install yt-dlp' });
      } else if (result.impersonate === false) {
        // this is not fatal but we want to make the user aware
        setMessage({
          type: 'warn',
          text: 'Browser impersonation not available – install curl_cffi (`pip install curl_cffi` or `yt-dlp[all]`) for better site compatibility.'
        });
      }
    }
  };

  const setAsDefaultDownloadManager = async () => {
    if (!window.electronAPI?.setDefaultDownloadManager) return;
    const result = await window.electronAPI.setDefaultDownloadManager();

    if (result.isDev) {
      showMessage('info', result.message || 'Cannot set as default in development mode. Package the app first.');
      return;
    }

    if (result.success) {
      setIsDefaultDownloadManager(true);
      showMessage('success', 'Set as default download manager (magnet/torrent links).');
    } else {
      showMessage('error', 'Failed to set as default download manager. Try running as administrator or packaging the app.');
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
    setImageInfo(null);
    setSelectedFormat(null);

    const lowerUrl = videoUrl.trim().toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif|heic|heif)$/i.test(lowerUrl) || 
                   lowerUrl.includes('i.pinimg.com') || 
                   lowerUrl.includes('pinterest.com/pin/');

    if (isImage) {
      // Handle image info
      try {
        const result = await window.electronAPI.getImageInfo(videoUrl.trim());
        
        if (result.success) {
          setImageInfo(result.info);
          showMessage('success', 'Image information loaded');
        } else {
          showMessage('error', result.error || 'Failed to fetch image information');
        }
      } catch (error) {
        showMessage('error', 'An error occurred while fetching image info');
      }
    } else {
      // Handle video info
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
      }
    }
    
    setIsLoading(false);
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

    try {
      const result = await window.electronAPI.downloadVideo({
        url: videoUrlToDownload,
        format: selectedFormat,
        quality: downloadQuality,
        outputPath: downloadFolder,
        networkQuality,
        videoInfo,
        force: false
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
    const isMega = lowerUrl.includes('mega.nz');
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif|heic|heif)$/i.test(lowerUrl) || 
                   lowerUrl.includes('i.pinimg.com') || 
                   lowerUrl.includes('pinterest.com/pin/');

    if (isMagnet || isTorrent) {
      showMessage('info', 'Starting torrent download...');
    } else if (isImage) {
      // For Pinterest URLs, use universal download (yt-dlp) which handles anti-bot measures
      if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('i.pinimg.com')) {
        showMessage('info', 'Downloading from Pinterest...');
        try {
          const result = await window.electronAPI.universalDownload({
            url: url,
            outputPath: downloadFolder,
            networkQuality,
            ...settings
          });
          
          if (result.success) {
            setActiveDownloads(prev => {
              const newDownloads = new Map(prev);
              newDownloads.set(result.downloadId, {
                id: result.downloadId,
                title: result.title || 'Pinterest Image',
                url: url,
                progress: 0,
                speed: '0',
                eta: 'Calculating...'
              });
              return newDownloads;
            });
            showMessage('success', 'Pinterest image download started!');
            setVideoUrl('');
          } else {
            showMessage('error', result.error || 'Failed to start Pinterest download');
          }
        } catch (error) {
          showMessage('error', error.message || 'Failed to start Pinterest download');
        }
      } else {
        // Direct image URLs (non-Pinterest)
        showMessage('info', 'Getting image information...');
        try {
          // First get image info
          const imageInfoResult = await window.electronAPI.getImageInfo(url);
          
          if (imageInfoResult.success) {
            const info = imageInfoResult.info;
            showMessage('info', `Downloading ${info.filename} (${info.contentType || 'image'})`);
          } else {
            showMessage('info', 'Downloading image...');
          }
          
          // Then download the image
          const result = await window.electronAPI.downloadImage({
            url: url,
            outputPath: downloadFolder
          });
          
          if (result.success) {
            setActiveDownloads(prev => {
              const newDownloads = new Map(prev);
              newDownloads.set(result.downloadId, {
                id: result.downloadId,
                title: result.title || 'Image Download',
                url: url,
                progress: 0,
                speed: '0',
                eta: 'Calculating...'
              });
              return newDownloads;
            });
            showMessage('success', 'Image download started!');
            setVideoUrl('');
          } else {
            showMessage('error', result.error || 'Failed to start image download');
          }
        } catch (error) {
          showMessage('error', error.message || 'Failed to start image download');
        }
      }
    } else if (isMega) {
      showMessage('info', 'Starting Mega.nz download...');
      try {
        const result = await window.electronAPI.directDownload({
          url: url,
          outputPath: downloadFolder,
          networkQuality,
          ...settings
        });

        if (result.success) {
          setActiveDownloads(prev => {
            const newDownloads = new Map(prev);
            newDownloads.set(result.downloadId, {
              id: result.downloadId,
              title: 'Mega Download',
              url: url,
              progress: 0,
              speed: '0',
              eta: 'Calculating...'
            });
            return newDownloads;
          });
          showMessage('success', 'Mega download started!');
          setVideoUrl('');
        } else {
          showMessage('error', result.error || 'Failed to start Mega download');
        }
      } catch (error) {
        showMessage('error', error.message || 'Failed to start Mega download');
      }
    } else {
      showMessage('info', 'Starting universal download from any website...');
      try {
        // Use universal download for all URLs - this handles any website
        const result = await window.electronAPI.universalDownload({
          url: url,
          outputPath: downloadFolder,
          networkQuality,
          ...settings
        });
        
        if (result.success) {
          setActiveDownloads(prev => {
            const newDownloads = new Map(prev);
            newDownloads.set(result.downloadId, {
              id: result.downloadId,
              title: result.title || 'Universal Download',
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
    // Clear selected if it was this download
    if (selectedDownload?.id === downloadId) {
      setSelectedDownload(null);
    }
  };

  const renameDownload = async (downloadId, newTitle) => {
    try {
      // Find the download in both active and completed
      let download = activeDownloads.get(downloadId) || completedDownloads.get(downloadId);
      if (!download || !download.filePath) {
        showMessage('error', 'File not found or not yet downloaded');
        return;
      }

      const result = await window.electronAPI.renameFile({
        filePath: download.filePath,
        newTitle: newTitle
      });

      if (result.success) {
        // Update the file path and title in the download object
        const updatedDownload = {
          ...download,
          title: newTitle,
          filePath: result.newFilePath
        };

        // Update in the appropriate map
        if (activeDownloads.has(downloadId)) {
          setActiveDownloads(prev => {
            const newMap = new Map(prev);
            newMap.set(downloadId, updatedDownload);
            return newMap;
          });
        } else if (completedDownloads.has(downloadId)) {
          setCompletedDownloads(prev => {
            const newMap = new Map(prev);
            newMap.set(downloadId, updatedDownload);
            return newMap;
          });
        }

        // Update selected download if it's the one being renamed
        if (selectedDownload?.id === downloadId) {
          setSelectedDownload(updatedDownload);
        }

        showMessage('success', 'File renamed successfully');
      } else {
        showMessage('error', result.error || 'Failed to rename file');
      }
    } catch (error) {
      showMessage('error', 'Failed to rename file');
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getTabTitle = () => {
    switch(activeTab) {
      case 'downloads': return 'Downloads';
      case 'history': return 'Download History';
      case 'settings': return 'Settings';
      default: return '';
    }
  };

  // Early return AFTER all hooks are called
  if (!isElectron) {
    return <NonElectronWarning />;
  }

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
              <span className="text-blue-400">{getTabTitle()}</span>
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
              {isDefaultDownloadManager === false && !hideDefaultManagerPrompt && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                  <div className="flex-1 text-xs text-yellow-100">
                    <strong>Make VDR your default download manager.</strong> This lets the app handle <span className="font-medium">magnet</span> and <span className="font-medium">torrent</span> links automatically.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg text-xs font-semibold"
                      onClick={setAsDefaultDownloadManager}
                    >
                      Set as default
                    </button>
                    <button
                      className="px-2 py-1 text-yellow-200 hover:text-white text-xs"
                      onClick={() => setHideDefaultManagerPrompt(true)}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center bg-black/50 backdrop-blur-sm border rounded-2xl px-4 transition-all duration-300 ${
                  isUrlInputFocused 
                    ? 'border-blue-500/50 bg-black/60 shadow-lg shadow-blue-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}>
                  <input
                    type="url"
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 px-3 py-3"
                    placeholder="Paste video URL (YouTube, Vimeo, etc.) or image URL (Pinterest, direct links, etc.)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchVideoInfo()}
                    onFocus={() => setIsUrlInputFocused(true)}
                    onBlur={() => setIsUrlInputFocused(false)}
                    disabled={!ytDlpInstalled}
                  />
                  {videoUrl && (
                    <button
                      onClick={async () => {
                        if (window.electronAPI?.copyToClipboard) {
                          const result = await window.electronAPI.copyToClipboard(videoUrl);
                          if (result.success) {
                            showMessage('success', 'URL copied to clipboard');
                          } else {
                            showMessage('error', 'Failed to copy URL');
                          }
                        }
                      }}
                      className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                      title="Copy URL"
                    >
                      <Icons.Copy />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (window.electronAPI?.readFromClipboard) {
                        const result = await window.electronAPI.readFromClipboard();
                        if (result.success && result.text) {
                          setVideoUrl(result.text);
                          showMessage('success', 'URL pasted from clipboard');
                        } else {
                          showMessage('error', 'Failed to paste from clipboard');
                        }
                      }
                    }}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    title="Paste from clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={fetchVideoInfo}
                  disabled={isLoading || !ytDlpInstalled || !videoUrl.trim()}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
                >
                  {isLoading ? <LoadingSpinner /> : <span>Get Info</span>}
                </button>
                
                <button
                  onClick={handleQuickDownload}
                  disabled={!videoUrl.trim()}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300"
                  title="Quick download any file"
                >
                  Quick
                </button>
                
                <button
                  onClick={handleQuickDownload}
                  disabled={!videoUrl.trim()}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-300"
                  title="Download torrents"
                >
                  Torrent
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
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium text-sm line-clamp-2 flex-1">{videoInfo.title}</h4>
                            <button
                              onClick={async () => {
                                if (window.electronAPI?.copyToClipboard) {
                                  const result = await window.electronAPI.copyToClipboard(videoInfo.title);
                                  if (result.success) {
                                    showMessage('success', 'Title copied to clipboard');
                                  } else {
                                    showMessage('error', 'Failed to copy title');
                                  }
                                }
                              }}
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                              title="Copy title"
                            >
                              <Icons.Copy />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-white/50 text-xs flex-1">
                              {videoInfo.uploader && <span>By {videoInfo.uploader}</span>}
                              {videoInfo.duration && <span className="mx-1">·</span>}
                              {videoInfo.duration && <span>{formatDuration(videoInfo.duration)}</span>}
                            </p>
                            <button
                              onClick={async () => {
                                if (window.electronAPI?.copyToClipboard) {
                                  const url = videoInfo.webpage_url || videoUrl;
                                  const result = await window.electronAPI.copyToClipboard(url);
                                  if (result.success) {
                                    showMessage('success', 'URL copied to clipboard');
                                  } else {
                                    showMessage('error', 'Failed to copy URL');
                                  }
                                }
                              }}
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                              title="Copy URL"
                            >
                              <Icons.Copy />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <select 
                              className="bg-black/50 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                              value={selectedFormat?.format_id || ''}
                              onChange={(e) => {
                                const format = videoInfo.formats?.find(f => f.format_id === e.target.value);
                                setSelectedFormat(format);
                              }}
                            >
                              {videoInfo.formats && videoInfo.formats
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

                {/* Image Info Panel */}
                {imageInfo && (
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
                    <div className="px-3 py-2 bg-black/50 border-b border-white/5">
                      <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                        <Icons.Image />
                        Image Information
                      </h3>
                    </div>
                    <div className="p-3">
                      <div className="flex gap-3">
                        <div className="w-28 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                          <Icons.Image className="w-8 h-8 text-white/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium text-sm line-clamp-2 flex-1">{imageInfo.filename}</h4>
                            <button
                              onClick={async () => {
                                if (window.electronAPI?.copyToClipboard) {
                                  const result = await window.electronAPI.copyToClipboard(imageInfo.filename);
                                  if (result.success) {
                                    showMessage('success', 'Filename copied to clipboard');
                                  } else {
                                    showMessage('error', 'Failed to copy filename');
                                  }
                                }
                              }}
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                              title="Copy filename"
                            >
                              <Icons.Copy />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-white/50 text-xs flex-1">
                              {imageInfo.contentType && <span>{imageInfo.contentType}</span>}
                              {imageInfo.size && <span className="mx-1">·</span>}
                              {imageInfo.size && <span>{formatFileSize(imageInfo.size)}</span>}
                              {imageInfo.estimatedDimensions && <span className="mx-1">·</span>}
                              {imageInfo.estimatedDimensions && (
                                <span>
                                  {imageInfo.estimatedDimensions.width === 'Original' 
                                    ? 'Original Quality' 
                                    : `${imageInfo.estimatedDimensions.width}×${imageInfo.estimatedDimensions.height}`}
                                </span>
                              )}
                            </p>
                            <button
                              onClick={async () => {
                                if (window.electronAPI?.copyToClipboard) {
                                  const result = await window.electronAPI.copyToClipboard(videoUrl);
                                  if (result.success) {
                                    showMessage('success', 'URL copied to clipboard');
                                  } else {
                                    showMessage('error', 'Failed to copy URL');
                                  }
                                }
                              }}
                              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                              title="Copy URL"
                            >
                              <Icons.Copy />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => handleQuickDownload()}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-300 flex items-center gap-1.5 text-xs"
                            >
                              <Icons.Download />
                              <span>Download High Quality</span>
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
                          onSelect={setSelectedDownload}
                          onOpenFile={openFileLocation}
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
                          onSelect={setSelectedDownload}
                          onOpenFile={openFileLocation}
                          onDelete={removeFromList}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {activeDownloads.size === 0 && completedDownloads.size === 0 && !videoInfo && !imageInfo && (
                  <EmptyState 
                    icon={Icons.Rocket}
                    title="Ready to Download"
                    subtitle="Paste a video or image URL above to start downloading."
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
              <SettingsTab 
                downloadFolder={downloadFolder}
                networkQuality={networkQuality}
                downloadQuality={downloadQuality}
                settings={settings}
                isDefaultDownloadManager={isDefaultDownloadManager}
                isPackaged={isPackaged}
                setAsDefaultDownloadManager={setAsDefaultDownloadManager}
                onSelectFolder={selectDownloadFolder}
                onNetworkQualityChange={setNetworkQuality}
                onDownloadQualityChange={setDownloadQuality}
                onSettingsChange={updateSettings}
                onShowMessage={showMessage}
                formatFileSize={formatFileSize}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer - only show when there's content */}
      {(selectedDownload || activeDownloads.size > 0 || completedDownloads.size > 0) && (
        <VideoDetailsFooter 
          download={selectedDownload}
          activeDownloadsCount={activeDownloads.size}
          ytDlpInstalled={ytDlpInstalled}
          onOpenFolder={openFileLocation}
          onDelete={removeFromList}
          onRename={renameDownload}
        />
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ downloadFolder, networkQuality, downloadQuality, settings, isDefaultDownloadManager, isPackaged, setAsDefaultDownloadManager, onSelectFolder, onNetworkQualityChange, onDownloadQualityChange, onSettingsChange, onShowMessage, formatFileSize }) {
  return (
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
                onClick={onSelectFolder}
                className="px-3 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg border border-white/10 transition-all text-xs"
              >
                Browse
              </button>
            </div>
          </div>

          {/* Default Download Manager */}
          <div className="bg-black/50 border border-white/10 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-white/70">
                Set VDR as the default download manager for <span className="text-white">magnet</span> and <span className="text-white">torrent</span> links.
                {isPackaged === false && (
                  <div className="mt-1 text-yellow-400 text-xs">
                    ⚠️ Only works when app is packaged/installed.
                  </div>
                )}
              </div>
              <button
                onClick={setAsDefaultDownloadManager}
                disabled={isDefaultDownloadManager === true}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-300 text-white rounded-lg text-xs font-medium"
              >
                {isDefaultDownloadManager ? 'Already default' : 'Set as default'}
              </button>
            </div>
            <div className="mt-2 text-xs text-white/50">
              Current status: {isDefaultDownloadManager === null ? 'Checking…' : isDefaultDownloadManager ? 'App is default handler' : 'Not default yet'}
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
              onChange={(e) => onNetworkQualityChange(e.target.value)}
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
              onChange={(e) => onDownloadQualityChange(e.target.value)}
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
              onChange={(e) => onSettingsChange({ cookieBrowser: e.target.value })}
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
            <label className="text-white/70 text-xs font-medium block mb-1.5">Referer URL</label>
            <input
              type="text"
              className="w-full bg-black/50 border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 placeholder-white/30"
              placeholder="https://example.com"
              value={settings.referer || ''}
              onChange={(e) => onSettingsChange({ referer: e.target.value })}
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
              onChange={(e) => onSettingsChange({ userAgent: e.target.value })}
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
              onChange={(e) => onSettingsChange({ customHeaders: e.target.value })}
            />
          </div>

          {/* Clear Download History */}
          <button
            onClick={async () => {
              if (window.electronAPI?.clearDownloadHistory) {
                await window.electronAPI.clearDownloadHistory();
                onShowMessage('success', 'Download history cleared');
              }
            }}
            className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition-all text-xs"
          >
            Clear Download History
          </button>
        </div>
      </div>

      {/* Log Management */}
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
        <div className="px-3 py-2 bg-black/50 border-b border-white/5">
          <h3 className="text-white font-medium flex items-center gap-2 text-sm">
            <Icons.Info />
            Application Logs
          </h3>
        </div>
        <div className="p-3 space-y-4">
          <p className="text-white/50 text-xs">
            View and manage application log files. Logs are automatically rotated daily.
          </p>

          {/* View Logs Button */}
          <button
            onClick={async () => {
              if (window.electronAPI?.getLogFiles) {
                const result = await window.electronAPI.getLogFiles();
                if (result.success) {
                  const logList = result.files.map(f => `${f.name} (${formatFileSize(f.size)})`).join('\n');
                  onShowMessage('info', `Log files:\n${logList}`);
                } else {
                  onShowMessage('error', 'Failed to get log files');
                }
              }
            }}
            className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/30 transition-all text-xs"
          >
            View Log Files
          </button>

          {/* Clear Old Logs */}
          <button
            onClick={async () => {
              if (window.confirm('Clear log files older than 7 days?')) {
                if (window.electronAPI?.clearOldLogs) {
                  const result = await window.electronAPI.clearOldLogs(7);
                  if (result.success) {
                    onShowMessage('success', `Cleared ${result.deletedCount} old log files`);
                  } else {
                    onShowMessage('error', 'Failed to clear old logs');
                  }
                }
              }
            }}
            className="w-full px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg border border-yellow-500/30 transition-all text-xs"
          >
            Clear Old Logs (7+ days)
          </button>

          {/* Open Logs Folder */}
          <button
            onClick={async () => {
              if (window.electronAPI?.getLogsPath) {
                const logsPath = await window.electronAPI.getLogsPath();
                onShowMessage('info', `Logs folder: ${logsPath}`);
              } else {
                onShowMessage('info', 'Logs are stored in the OS user data folder (where app settings are saved).');
              }
            }}
            className="w-full px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg border border-gray-500/30 transition-all text-xs"
          >
            Logs Location
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
  );
}

// Video Details Footer Component
function VideoDetailsFooter({ download, activeDownloadsCount, ytDlpInstalled, onOpenFolder, onDelete, onRename }) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  
  const isCompleted = download?.completed;
  const isDownloading = download?.progress !== undefined && !isCompleted && !download?.failed;
  
  const handleRename = async () => {
    if (!newTitle.trim() || !download?.id) return;
    
    await onRename(download.id, newTitle.trim());
    setIsEditingTitle(false);
    setNewTitle('');
  };
  
  const startEditing = () => {
    setNewTitle(download?.title || '');
    setIsEditingTitle(true);
  };
  
  const cancelEditing = () => {
    setIsEditingTitle(false);
    setNewTitle('');
  };
  
  return (
    <div className="h-28 bg-slate-900/95 backdrop-blur-md border-t border-white/10 p-3">
      {download ? (
        <div className="flex items-start gap-4 h-full">
          {/* Thumbnail */}
          <div className="w-36 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 flex items-center justify-center">
            {download.thumbnail ? (
              <img src={download.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icons.Video className="w-8 h-8 text-white/50" />
            )}
          </div>
          
          {/* Video Info - Full Details */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                    className="flex-1 bg-black/50 border border-white/20 text-white rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Enter new title..."
                    autoFocus
                  />
                  <button
                    onClick={handleRename}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white text-sm font-medium truncate flex-1">{download.title || 'Unknown'}</h4>
                {isCompleted && download.filePath && (
                  <button
                    onClick={startEditing}
                    className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs transition-all"
                    title="Rename file"
                  >
                    <Icons.Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {download.totalSize && (
                <span className="text-white/60 flex items-center gap-1">
                  <Icons.Download className="w-3 h-3" /> {download.totalSize}
                </span>
              )}
              {download.speed && isDownloading && (
                <span className="text-blue-400 flex items-center gap-1">
                  <Icons.Bolt className="w-3 h-3" /> {download.speed}
                </span>
              )}
              {download.progress !== undefined && !isCompleted && (
                <span className="text-yellow-400 flex items-center gap-1">
                  {download.progress.toFixed(1)}%
                </span>
              )}
              {download.duration && (
                <span className="text-white/60 flex items-center gap-1">
                  <Icons.Clock className="w-3 h-3" /> {download.duration}
                </span>
              )}
              {download.format && (
                <span className="text-white/60 flex items-center gap-1">
                  <Icons.Video className="w-3 h-3" /> {download.format}
                </span>
              )}
              {download.resolution && (
                <span className="text-white/60">{download.resolution}</span>
              )}
              {isCompleted && (
                <span className="text-green-400 flex items-center gap-1">
                  <Icons.Check className="w-3 h-3" /> Completed
                </span>
              )}
              {download?.failed && (
                <span className="text-red-400 flex items-center gap-1">
                  <Icons.Close className="w-3 h-3" /> Failed
                </span>
              )}
            </div>
            {/* URL */}
            {download.url && (
              <p className="text-white/40 text-xs mt-1 truncate">{download.url}</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {isCompleted && download.filePath && (
                <button
                  onClick={() => onOpenFolder(download.filePath)}
                  className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-all"
                >
                  Open Folder
                </button>
              )}
              <button
                onClick={() => onDelete(download.id)}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between h-full">
          <span className="text-white/50 flex items-center gap-2 text-xs">
            {activeDownloadsCount > 0 ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Downloading {activeDownloadsCount} file(s)
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-blue-400 rounded-full" />
                Ready
              </>
            )}
          </span>
          <span className={`flex items-center gap-2 text-xs ${ytDlpInstalled ? 'text-green-400' : 'text-red-400'}`}>
            <Icons.Check />
            yt-dlp: {ytDlpInstalled ? 'Installed' : 'Not Found'}
          </span>
        </div>
      )}
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
