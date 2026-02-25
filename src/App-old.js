import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [downloadFolder, setDownloadFolder] = useState('');
  const [networkQuality, setNetworkQuality] = useState('medium');
  const [downloadQuality, setDownloadQuality] = useState('best');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [activeDownloads, setActiveDownloads] = useState(new Map());
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [ytDlpInstalled, setYtDlpInstalled] = useState(true);
  const [isElectron, setIsElectron] = useState(false);
  const [currentTab, setCurrentTab] = useState('downloader'); // 'downloader' or 'browser'
  const [browserUrl, setBrowserUrl] = useState('https://www.youtube.com');
  const [discoveredVideos, setDiscoveredVideos] = useState([]);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(!!window.electronAPI);
    
    if (window.electronAPI) {
      checkYtDlpInstallation();
    } else {
      // Running outside Electron - show warning
      setMessage({ 
        type: 'error', 
        text: 'This application requires Electron. Please run using npm run electron-dev' 
      });
    }
    
    // Set up progress listener
    let unsubscribe = null;
    
    if (window.electronAPI) {
      unsubscribe = window.electronAPI.onDownloadProgress((data) => {
        if (data.error) {
          // Only show error if it's not a routine message
          if (!data.error.includes('[download]') && !data.error.includes('yt-dlp')) {
            setMessage({ type: 'error', text: data.error });
          }
        } else {
          setDownloadProgress(data.progress || 0);
          setDownloadSpeed(data.speed || '');
          setDownloadEta(data.eta || '');
          
          if (data.completed) {
            setIsDownloading(false);
            setDownloadedFilePath(data.filePath || '');
            setMessage({ type: 'success', text: 'Download completed successfully!' });
          }
        }
      });
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      // Also remove the listener directly to be safe
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('download-progress');
      }
    };
  }, []);

  const checkYtDlpInstallation = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.checkYtDlp();
      setYtDlpInstalled(result.success);
      if (!result.success) {
        setMessage({ 
          type: 'error', 
          text: 'yt-dlp is not installed. Please install it first: pip install yt-dlp' 
        });
      }
    }
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
      showMessage('success', 'Download folder selected successfully');
    } else {
      showMessage('error', result.error || 'Failed to select folder');
    }
  };

  const fetchVideoInfo = async () => {
    if (!videoUrl.trim()) {
      showMessage('error', 'Please enter a video URL');
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
        showMessage('success', 'Video information fetched successfully');
        
        // Auto-select best format
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
    if (!videoInfo || !selectedFormat) {
      showMessage('error', 'Please select video information and format first');
      return;
    }

    if (!downloadFolder) {
      showMessage('error', 'Please select a download folder');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadedFilePath('');
    setMessage({ type: '', text: '' });

    try {
      const result = await window.electronAPI.downloadVideo({
        url: videoUrl,
        format: selectedFormat,
        quality: networkQuality,
        outputPath: downloadFolder,
        networkQuality,
        downloadQuality
      });

      if (!result.success) {
        showMessage('error', result.error || 'Download failed');
        setIsDownloading(false);
      }
    } catch (error) {
      showMessage('error', 'An error occurred during download');
      setIsDownloading(false);
    }
  };

  const cancelDownload = async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.cancelDownload();
      if (result.success) {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadedFilePath('');
        showMessage('info', 'Download cancelled');
      }
    } catch (error) {
      showMessage('error', 'Failed to cancel download');
    }
  };

  const openFileLocation = async () => {
    if (!window.electronAPI || !downloadedFilePath) return;

    try {
      const result = await window.electronAPI.openFileLocation(downloadedFilePath);
      if (!result.success) {
        showMessage('error', result.error || 'Failed to open file location');
      }
    } catch (error) {
      showMessage('error', 'Failed to open file location');
    }
  };

  const openDownloadFolder = async () => {
    if (!window.electronAPI || !downloadFolder) return;

    try {
      const result = await window.electronAPI.openDownloadFolder(downloadFolder);
      if (!result.success) {
        showMessage('error', result.error || 'Failed to open download folder');
      }
    } catch (error) {
      showMessage('error', 'Failed to open download folder');
    }
  };

  const formatDuration = (seconds) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📥 VDR Video Downloader
          </h1>
          <p className="text-gray-600">
            Download videos from YouTube, Facebook, TikTok, and 1000+ platforms
          </p>
        </header>

        {/* yt-dlp Installation Warning */}
        {!ytDlpInstalled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  yt-dlp not found
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Please install yt-dlp to use this application:</p>
                  <code className="bg-red-100 px-2 py-1 rounded text-xs">pip install yt-dlp</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* URL Input */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Video Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
                    Video URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="video-url"
                      className="input-field flex-1"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && fetchVideoInfo()}
                      disabled={!ytDlpInstalled}
                    />
                    <button
                      onClick={fetchVideoInfo}
                      disabled={isLoading || !ytDlpInstalled}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Loading...' : 'Get Info'}
                    </button>
                  </div>
                </div>

                {/* Folder Selection */}
                <div>
                  <label htmlFor="download-folder" className="block text-sm font-medium text-gray-700 mb-2">
                    Download Folder
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="download-folder"
                      className="input-field flex-1"
                      placeholder="Select download folder..."
                      value={downloadFolder}
                      readOnly
                    />
                    <button
                      onClick={selectDownloadFolder}
                      className="btn btn-secondary"
                    >
                      Browse
                    </button>
                  </div>
                </div>

                {/* Network Quality */}
                <div>
                  <label htmlFor="network-quality" className="block text-sm font-medium text-gray-700 mb-2">
                    Network Speed
                  </label>
                  <select
                    id="network-quality"
                    className="input-field"
                    value={networkQuality}
                    onChange={(e) => setNetworkQuality(e.target.value)}
                  >
                    <option value="fast">🚀 Fast (High Quality)</option>
                    <option value="medium">⚡ Medium (Balanced)</option>
                    <option value="slow">🐢 Slow (Stable)</option>
                    <option value="very-slow">🐌 Very Slow (Maximum Reliability)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Adjusts retry and connection settings</p>
                </div>

                {/* Download Quality */}
                <div>
                  <label htmlFor="download-quality" className="block text-sm font-medium text-gray-700 mb-2">
                    Video Quality
                  </label>
                  <select
                    id="download-quality"
                    className="input-field"
                    value={downloadQuality}
                    onChange={(e) => setDownloadQuality(e.target.value)}
                  >
                    <option value="best">🎬 Best Available (4K/HD)</option>
                    <option value="high">📺 High Quality (1080p)</option>
                    <option value="medium">📱 Standard (720p)</option>
                    <option value="low">📉 Low (480p)</option>
                    <option value="audio">🎵 Audio Only (MP3)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select output video quality</p>
                </div>
              </div>
            </div>

            {/* Video Info Display */}
            {videoInfo && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Video Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {videoInfo.thumbnail && (
                    <div className="md:col-span-2">
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full max-w-md rounded-lg shadow-sm"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{videoInfo.title}</h3>
                    <p className="text-sm text-gray-600">By {videoInfo.uploader || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      Duration: {videoInfo.duration ? formatDuration(videoInfo.duration) : 'Unknown'}
                    </p>
                    {videoInfo.view_count && (
                      <p className="text-sm text-gray-600">
                        Views: {videoInfo.view_count.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Format Selection */}
                {videoInfo.formats && videoInfo.formats.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Format
                    </label>
                    <select
                      className="input-field"
                      value={selectedFormat?.format_id || ''}
                      onChange={(e) => {
                        const format = videoInfo.formats.find(f => f.format_id === e.target.value);
                        setSelectedFormat(format);
                      }}
                    >
                      <option value="">Choose a format...</option>
                      {videoInfo.formats
                        .filter(f => f.vcodec !== 'none' && f.height)
                        .sort((a, b) => (b.height || 0) - (a.height || 0))
                        .map((format) => (
                          <option key={format.format_id} value={format.format_id}>
                            {format.height}p {format.ext} - {format.fps}fps 
                            {format.filesize && ` (${formatFileSize(format.filesize)})`}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Progress Section */}
            {isDownloading && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Download Progress</h2>
                <div className="space-y-4">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{downloadProgress.toFixed(1)}%</span>
                    {downloadSpeed && <span>Speed: {downloadSpeed}</span>}
                    {downloadEta && <span>ETA: {downloadEta}</span>}
                  </div>
                  <button
                    onClick={cancelDownload}
                    className="btn btn-danger"
                  >
                    Cancel Download
                  </button>
                </div>
              </div>
            )}

            {/* Download Complete - Show File Location */}
            {downloadedFilePath && !isDownloading && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Download Complete!</h2>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-800 font-medium">Download completed successfully!</span>
                    </div>
                    <p className="text-sm text-green-700 break-all">
                      {downloadedFilePath}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openFileLocation}
                      className="btn btn-primary flex-1"
                    >
                      <span className="flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open File Location
                      </span>
                    </button>
                    <button
                      onClick={openDownloadFolder}
                      className="btn btn-secondary flex-1"
                    >
                      <span className="flex items-center justify-center">
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Open Download Folder
                      </span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setDownloadedFilePath('');
                      setVideoUrl('');
                      setVideoInfo(null);
                      setSelectedFormat(null);
                    }}
                    className="w-full btn btn-outline"
                  >
                    Download Another Video
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Messages */}
          <div className="space-y-6">
            {/* Download Button */}
            {videoInfo && selectedFormat && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <button
                  onClick={downloadVideo}
                  disabled={isDownloading || !downloadFolder}
                  className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? 'Downloading...' : 'Download Video'}
                </button>
              </div>
            )}

            {/* Messages */}
            {message.text && (
              <div
                className={`rounded-lg p-4 ${
                  message.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold mb-3">How to Use</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Paste video URL from any supported platform</li>
                <li>Click "Get Info" to fetch video details</li>
                <li>Select your preferred quality format</li>
                <li>Choose download folder</li>
                <li>Click "Download Video" to start</li>
              </ol>
            </div>

            {/* Supported Platforms */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold mb-3">Supported Platforms</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>• YouTube</div>
                <div>• Facebook</div>
                <div>• TikTok</div>
                <div>• Instagram</div>
                <div>• Twitter/X</div>
                <div>• Vimeo</div>
                <div>• Twitch</div>
                <div>• And 1000+ more</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
