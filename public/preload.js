const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls for frameless window
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Default download folder
  getDefaultDownloadFolder: () => ipcRenderer.invoke('get-default-download-folder'),
  
  // Folder selection
  selectDownloadFolder: () => ipcRenderer.invoke('select-download-folder'),
  
  // Video operations
  getVideoInfo: (url) => {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid URL' });
    }
    return ipcRenderer.invoke('get-video-info', url);
  },
  downloadVideo: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('download-video', options);
  },
  // Direct download - for movies, songs, pictures, PDFs and any file type
  directDownload: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('direct-download', options);
  },
  // Torrent download - for magnet links and .torrent files
  downloadTorrent: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('download-torrent', options);
  },
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),
  cancelAllDownloads: () => ipcRenderer.invoke('cancel-all-downloads'),
  getActiveDownloads: () => ipcRenderer.invoke('get-active-downloads'),
  checkYtDlp: () => ipcRenderer.invoke('check-yt-dlp'),
  getBrowserList: () => ipcRenderer.invoke('get-browser-list'),
  extractBrowserCookies: (browser) => ipcRenderer.invoke('extract-browser-cookies', browser),
  pauseDownload: (downloadId) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId) => ipcRenderer.invoke('resume-download', downloadId),
  
  // Download history operations
  checkDownloadHistory: (url) => {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ exists: false });
    }
    return ipcRenderer.invoke('check-download-history', url);
  },
  getDownloadHistory: () => ipcRenderer.invoke('get-download-history'),
  clearDownloadHistory: () => ipcRenderer.invoke('clear-download-history'),
  
  // File operations
  openFileLocation: (filePath) => {
    if (!filePath || typeof filePath !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid file path' });
    }
    return ipcRenderer.invoke('open-file-location', filePath);
  },
  openDownloadFolder: (folderPath) => {
    if (!folderPath || typeof folderPath !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid folder path' });
    }
    return ipcRenderer.invoke('open-download-folder', folderPath);
  },
  
  // Progress tracking
  onDownloadProgress: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, data) => {
      
      callback(data);
    };
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
  
  // Speed optimization tracking
  onSpeedOptimization: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('speed-optimization', subscription);
    return () => ipcRenderer.removeListener('speed-optimization', subscription);
  },
  
  // Network speed detection
  onNetworkSpeedDetected: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('network-speed-detected', subscription);
    return () => ipcRenderer.removeListener('network-speed-detected', subscription);
  },
  
  // Cleanup
  removeAllListeners: (channel) => {
    if (channel && typeof channel === 'string') {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  setAsDefaultDownloadManager: () => ipcRenderer.invoke('set-default-download-manager'),
  checkNotificationsSupport: () => ipcRenderer.invoke('check-notifications-support'),
  
  // Protocol URL handler
  onOpenUrl: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, url) => callback(url);
    ipcRenderer.on('open-url', subscription);
    return () => ipcRenderer.removeListener('open-url', subscription);
  },
  
  // Protocol URL handler (for when app is already open)
  onProtocolUrl: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, url) => callback(url);
    ipcRenderer.on('protocol-url', subscription);
    return () => ipcRenderer.removeListener('protocol-url', subscription);
  }
});
