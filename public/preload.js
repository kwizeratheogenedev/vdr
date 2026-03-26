const { contextBridge, ipcRenderer } = require('electron');

// Forward renderer console output to the main process so it can be logged via Winston.
// This captures logs from React and other renderer-side code.
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

const sendConsoleLog = (level, ...args) => {
  try {
    ipcRenderer.send('renderer-log', {
      level,
      message: args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '),
      meta: { source: 'renderer' }
    });
  } catch (e) {
    // Ignore if IPC isn't available yet
  }
};

console.log = (...args) => {
  originalConsole.log(...args);
  sendConsoleLog('info', ...args);
};
console.info = (...args) => {
  originalConsole.info(...args);
  sendConsoleLog('info', ...args);
};
console.warn = (...args) => {
  originalConsole.warn(...args);
  sendConsoleLog('warn', ...args);
};
console.error = (...args) => {
  originalConsole.error(...args);
  sendConsoleLog('error', ...args);
};
console.debug = (...args) => {
  originalConsole.debug(...args);
  sendConsoleLog('debug', ...args);
};

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
  // Universal download - for any file from any website (images, videos, documents)
  universalDownload: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('universal-download', options);
  },
  // Image download - for direct image URLs
  downloadImage: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('download-image', options);
  },
  // Get image information
  getImageInfo: (url) => {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid URL' });
    }
    return ipcRenderer.invoke('get-image-info', url);
  },
  // Rename downloaded file
  renameFile: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('rename-file', options);
  },
  // Get info about any URL (for universal downloads)
  getUniversalInfo: (url) => {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid URL' });
    }
    return ipcRenderer.invoke('get-universal-info', url);
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
  
  // Log management
  getLogsPath: () => ipcRenderer.invoke('get-logs-path'),
  getLogFiles: () => ipcRenderer.invoke('get-log-files'),
  getLogContent: (filename) => ipcRenderer.invoke('get-log-content', filename),
  clearOldLogs: (daysToKeep) => ipcRenderer.invoke('clear-old-logs', daysToKeep),

  // Clipboard operations
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  readFromClipboard: () => ipcRenderer.invoke('read-from-clipboard'),

  // Default download manager (magnet/torrent) registration
  isDefaultDownloadManager: () => ipcRenderer.invoke('is-default-download-manager'),
  setDefaultDownloadManager: () => ipcRenderer.invoke('set-default-download-manager'),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
  
  // Download progress tracking
  onDownloadProgress: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },

  // Expose a way for renderer to send logs to the main process
  log: (level, message, meta) => {
    ipcRenderer.send('renderer-log', { level, message, meta });
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
  },
  // Get file info without downloading
  getFileInfo: (url) => {
    if (!url || typeof url !== 'string') {
      return Promise.resolve({ success: false, error: 'Invalid URL' });
    }
    return ipcRenderer.invoke('get-file-info', url);
  },
  
  // Batch download multiple URLs
  batchDownload: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('batch-download', options);
  },
  
  // Download with custom filename
  downloadWithFilename: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('download-with-filename', options);
  },
  
  // Download with browser cookies
  downloadWithCookies: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.resolve({ success: false, error: 'Invalid options' });
    }
    return ipcRenderer.invoke('download-with-cookies', options);
  },
});
