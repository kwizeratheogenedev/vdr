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
  
  const { settings, updateSettings, loadSettings } = useSettings();
  
  const { updateDownloadProgress } = useDownloadProgress({
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
  }, [activeDownloads, completedDownloads, selectedDownload?.id]);

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
  }, [activeDownloads.size, completedDownloads.size]);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(!!window.electronAPI);
  }, []);

  useEffect(() => {
    if (isElectron) {
      checkYtDlpInstallation();
      getDefaultDownloadFolder();
      loadSettings();
    }
  }, [isElectron]);

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

    if (isMagnet || isTorrent) {
      showMessage('info', 'Starting torrent download...');
    } else {
      showMessage('info', 'Starting download...');
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
    // Clear selected if it was this download
    if (selectedDownload?.id === downloadId) {
      setSelectedDownload(null);
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
              <div className="flex gap-3">
                <div className={`flex-1 flex items-center bg-black/50 backdrop-blur-sm border rounded-2xl px-4 transition-all duration-300 ${
                  isUrlInputFocused 
                    ? 'border-blue-500/50 bg-black/60 shadow-lg shadow-blue-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}>
                  <input
                    type="url"
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 px-3 py-3"
                    placeholder="Paste video URL here (YouTube, Vimeo, TikTok, Pinterest, etc.)"
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
                          <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">{videoInfo.title}</h4>
                          <p className="text-white/50 text-xs mb-2">
                            {videoInfo.uploader && <span>By {videoInfo.uploader}</span>}
                            {videoInfo.duration && <span className="mx-1">·</span>}
                            {videoInfo.duration && <span>{formatDuration(videoInfo.duration)}</span>}
                          </p>
                          onDelete={removeFromList}
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
                onSelectFolder={selectDownloadFolder}
                onNetworkQualityChange={setNetworkQuality}
                onDownloadQualityChange={setDownloadQuality}
                onSettingsChange={updateSettings}
                onShowMessage={showMessage}
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
        />
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ downloadFolder, networkQuality, downloadQuality, settings, onSelectFolder, onNetworkQualityChange, onDownloadQualityChange, onSettingsChange, onShowMessage }) {
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
function VideoDetailsFooter({ download, activeDownloadsCount, ytDlpInstalled, onOpenFolder, onDelete }) {
  const isCompleted = download?.completed;
  const isDownloading = download?.progress !== undefined && !isCompleted && !download?.failed;
  
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
            <h4 className="text-white text-sm font-medium truncate mb-1">{download.title || 'Unknown'}</h4>
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
