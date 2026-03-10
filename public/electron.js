const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB

// Replace console methods with electron-log
Object.assign(console, log.functions);

log.info('Application starting...');

// Fix PATH to include user binaries (needed for yt-dlp and node)
const userBinPath = path.join(process.env.HOME, '.local', 'bin');
if (!process.env.PATH.includes(userBinPath)) {
  process.env.PATH = userBinPath + ':' + process.env.PATH;
}

let mainWindow;
let activeDownloads = new Map();
let downloadIdCounter = 0;
const downloadMonitors = new Map();
const downloadedVideos = new Map();

// Get default download folder
const getDefaultDownloadFolder = () => {
  return app.getPath('downloads') || path.join(app.getPath('home'), 'Downloads');
};

// Supported video platforms
const SUPPORTED_PLATFORMS = [
  'youtube.com', 'youtu.be', 'youtube-nocookie.com',
  'vimeo.com', 'dailymotion.com', 'twitch.tv', 'twitchcdn.net',
  'facebook.com', 'fb.watch', 'instagram.com',
  'twitter.com', 'x.com', 'tiktok.com',
  'pinterest.com', 'pinterest.pt', 'pin.it',
  'reddit.com', 'redgifs.com',
  'netflix.com', 'hulu.com', 'disneyplus.com', 'amazon.com', 'primevideo.com',
  'hbomax.com', 'max.com', 'apple.com', 'tv.apple.com', 'movies.apple.com',
  'yts.mx', 'yts.am', 'yts.ag', 'yifymovies.org', 'torlock.com',
  '1337x.to', 'rarbg.to', 'torrentz2.eu', 'torrentgalaxy.to',
  'tamilblasters.si', 'tamilblasters.ws', 'movierulz.wap', 'movierulz.tv',
  'moviesverse.org', 'filmyzilla.sbs', 'filmy4wap.xyz',
  'agasobanuye.com', 'agasobanuyenow.com', 'agasobanuyetimes.com', 
  'agasobanuyestore.com', 'agasobanuye.net', 'agasobanuye.org',
  'rwanda-movies.com', 'rwandacinema.com', 'africamovies.com',
  'guujar.com', 'web.wootly.ch', 'wootly.ch', 'moviewatch.com', 'onlinemoviesfree.com',
  'putlocker.io', 'putlocker.vip', 'soap2day.to', 'soap2day.sh',
  'fmovies.to', 'fmovies.se', 'bmovies.se', 'cmovieshd.com',
  'vidcloud9.com', 'vidembed.net', 'streamsb.net', 'doodstream.com',
  'upstream.to', 'streamtape.com', 'vidoza.net',
  'mediafire.com', 'mega.nz', 'dropbox.com', 'google.com', 'drive.google.com',
  'onedrive.live.com', 'pcloud.com',
  'soundcloud.com', 'bandcamp.com', 'mixcloud.com',
  'doodrive.com', 'wetransfer.com', 'sendspace.com',
  'ok.ru', 'vk.com', 'mail.ru', 'cloudmail.ru',
  'bilibili.com', 'nicovideo.jp',
  'archive.org', 'github.com', 'gitlab.com', 'bitbucket.org',
  'lookmovie2.io', 'lookmovie.ag', 'moviesjoy.net', 'moviesjoy.to',
  'cineb.net', 'movies2k.org', 'filmoflix.to', 'seriesonline.io',
  'animedao.to', 'animeout.xyz', 'kissanime.ru',
  'nigerianmovies.com', 'nigerianfilm24.com', 'afrofilm.live',
  'kannywood.com', 'nollywood.com', 'ghanaflicks.com'
];

const VIDEO_EXTENSIONS = [
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', 
  '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts'
];

const isValidVideoUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' };
    }
    const lowerUrl = urlString.toLowerCase();
    const isDirectVideo = VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext));
    if (isDirectVideo) {
      return { valid: true, type: 'direct' };
    }
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const isSupported = SUPPORTED_PLATFORMS.some(platform => 
      hostname === platform || hostname.endsWith('.' + platform)
    );
    if (!isSupported) {
      return { valid: true, type: 'general' };
    }
    return { valid: true, type: 'supported' };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format.' };
  }
};

const isDirectoryWritable = (dirPath) => {
  try {
    const testFile = path.join(dirPath, '.write-test-' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { writable: true };
  } catch (error) {
    return { writable: false, error: error.message };
  }
};

const getHistoryFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'download-history.json');
};

const loadDownloadHistory = () => {
  try {
    const historyPath = getHistoryFilePath();
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      const history = JSON.parse(data);
      for (const [url, info] of Object.entries(history)) {
        downloadedVideos.set(url, info);
      }
    }
  } catch (error) {
    log.error('Failed to load download history:', error);
  }
};

const saveDownloadHistory = () => {
  try {
    const historyPath = getHistoryFilePath();
    const history = {};
    for (const [url, info] of downloadedVideos) {
      history[url] = info;
    }
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    log.error('Failed to save download history:', error);
  }
};

// Global error handlers
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 800,
    minWidth: 700,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });

  log.info('Main window created');
}

// Window control handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-default-download-folder', () => {
  return getDefaultDownloadFolder();
});

ipcMain.handle('select-download-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Download Folder'
  });
  
  if (result.canceled) {
    return { success: false, canceled: true };
  }
  
  const folderPath = result.filePaths[0];
  const writable = isDirectoryWritable(folderPath);
  
  if (!writable.writable) {
    return { success: false, error: 'Directory is not writable: ' + writable.error };
  }
  
  return { success: true, folderPath };
});

// Video info
ipcMain.handle('get-video-info', async (event, url) => {
  log.info('Getting video info for:', url);
  
  const validation = isValidVideoUrl(url);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings',
      url
    ];

    const process = spawn('yt-dlp', args);
    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve({ success: true, info });
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse video info' });
        }
      } else {
        log.error('yt-dlp error:', errorOutput);
        resolve({ success: false, error: errorOutput || 'Failed to fetch video info' });
      }
    });

    process.on('error', (error) => {
      log.error('Failed to spawn yt-dlp:', error);
      resolve({ success: false, error: 'yt-dlp not found. Please install it: pip install yt-dlp' });
    });
  });
});

// Download video
// Track download progress for manual speed calculation
const downloadProgressTracker = new Map();

ipcMain.handle('download-video', async (event, options) => {
  const { url, format, quality, outputPath, networkQuality, videoInfo } = options;
  const downloadId = ++downloadIdCounter;
  
  log.info('Starting download:', url, 'with id:', downloadId);
  
  // Initialize progress tracker
  downloadProgressTracker.set(downloadId, {
    startTime: Date.now(),
    lastUpdate: Date.now(),
    lastBytes: 0,
    speedSamples: []
  });

  const outputDir = outputPath || getDefaultDownloadFolder();
  
  // Build yt-dlp arguments
  const args = [
    '-f', format ? format.format_id : 'best',
    '-o', path.join(outputDir, '%(title)s.%(ext)s'),
    '--no-warnings',
    '--progress',
    url
  ];

  // Add quality preference
  if (quality && quality !== 'best') {
    args.push('--format', `best[height<=${quality}]`);
  }

  // Network quality settings
  const qualitySettings = {
    fast: { retries: 3, timeout: 60 },
    medium: { retries: 5, timeout: 120 },
    slow: { retries: 10, timeout: 300 },
    veryslow: { retries: 15, timeout: 600 }
  };

  const q = qualitySettings[networkQuality] || qualitySettings.medium;
  args.push('--retries', q.retries, '--socket-timeout', q.timeout);

  const displayTitle = videoInfo?.title || 'Video';

  return new Promise((resolve) => {
    const process = spawn('yt-dlp', args);
    
    activeDownloads.set(downloadId, { process, url, title: displayTitle });

    // Parse progress from yt-dlp output (both stdout and stderr)
    const parseProgress = (output) => {
      // yt-dlp progress formats:
      // [download]  45.5% of 100.0MiB at  5.2MiB/s ETA 00:32
      // [download]  10.0% of ~50.0MiB at    1.5MiB/s ETA 00:15
      // [download] Destination: filename.mp4
      // [download] 0.0% of 10.0M at 1.2MiB/s ETA 00:10 (downloader#1)
      
      let progress = null;
      let speed = null;
      let eta = null;
      let downloadedSize = null;
      
      // Extract percentage - look for patterns like "45.5%" or "45%"
      const percentMatch = output.match(/(\d+\.?\d*)%/);
      if (percentMatch) {
        progress = parseFloat(percentMatch[1]);
      }
      
      // Extract speed - look for patterns like "5.2MiB/s", "1.5MB/s", "500k/s", "1M/s"
      // More lenient patterns to catch any speed format
      const speedPatterns = [
        /at\s+(\d+\.?\d*\w*\/s)/i,       // "at 5.2MiB/s" or "at 1M/s"
        /(\d+\.?\d*\w*\/s)\s+ETA/i,       // "5.2MiB/s ETA"
        /(\d+\.?\d*\w*\/s)\s+\(/i,        // "5.2MiB/s ("
        /(\d+\.?\d*[kKmMgG]\/?s)/          // "5M/s", "500k/s", "1.5G/s"
      ];
      for (const pattern of speedPatterns) {
        const match = output.match(pattern);
        if (match) {
          speed = match[1];
          break;
        }
      }
      
      // Fallback: look for any number followed by /s anywhere in the line
      if (!speed) {
        const fallbackMatch = output.match(/(\d+\.?\d*\w*\/s)/i);
        if (fallbackMatch) {
          speed = fallbackMatch[1];
        }
      }
      
      // Extract ETA
      const etaPatterns = [
        /ETA\s+(\d+:?\d*:?\d*)/i,
        /\((\d+:\d+)\)/,
        /remaining\s+(\d+:\d+)/i
      ];
      for (const pattern of etaPatterns) {
        const match = output.match(pattern);
        if (match) {
          eta = match[1];
          break;
        }
      }
      
      // Extract downloaded size
      const sizeMatch = output.match(/of\s+(\d+\.?\d*\w+)/i);
      if (sizeMatch) {
        downloadedSize = sizeMatch[1];
      }
      
      return {
        progress,
        speed,
        eta,
        downloadedSize
      };
    };

    process.stdout.on('data', (data) => {
      const output = data.toString();
      const progress = parseProgress(output);
      
      if ((progress.progress !== null || progress.speed) && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: progress.progress || 0,
          speed: progress.speed,
          eta: progress.eta,
          downloadedSize: progress.downloadedSize
        });
      }
    });

    process.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Debug: log raw output
      log.debug('yt-dlp raw output:', output);
      
      const progress = parseProgress(output);
      
      // Debug: log parsed progress
      log.debug('Parsed progress:', progress);
      
      // Calculate speed manually if not provided by yt-dlp
      let speed = progress.speed;
      if (!speed && progress.downloadedSize) {
        const tracker = downloadProgressTracker.get(downloadId);
        if (tracker) {
          const now = Date.now();
          const timeDiff = (now - tracker.lastUpdate) / 1000; // seconds
          if (timeDiff >= 1) { // Calculate speed every second
            // Estimate: parse downloaded size and calculate speed
            const sizeMatch = progress.downloadedSize.match(/(\d+\.?\d*)/);
            if (sizeMatch) {
              const currentBytes = parseFloat(sizeMatch[1]) * 1024 * 1024; // Assume MiB
              const bytesDiff = currentBytes - tracker.lastBytes;
              if (bytesDiff > 0 && timeDiff > 0) {
                const speedBps = bytesDiff / timeDiff;
                if (speedBps > 1024 * 1024) {
                  speed = (speedBps / (1024 * 1024)).toFixed(1) + 'MB/s';
                } else if (speedBps > 1024) {
                  speed = (speedBps / 1024).toFixed(0) + 'KB/s';
                }
                tracker.lastBytes = currentBytes;
                tracker.lastUpdate = now;
              }
            }
          }
        }
      }
      
      // yt-dlp sends progress to stderr - be more lenient in matching
      const hasProgress = progress.progress !== null || progress.speed || output.includes('%') || output.includes('s');
      
      if (hasProgress && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: progress.progress || 0,
          speed: speed,
          eta: progress.eta,
          downloadedSize: progress.downloadedSize
        });
      }
    });

    process.on('close', (code) => {
      log.info('Download completed with code:', code, 'for id:', downloadId);
      downloadProgressTracker.delete(downloadId);
      
      activeDownloads.delete(downloadId);
      stopSpeedMonitoring(downloadId);

      if (code === 0) {
        // Find the downloaded file
        const title = displayTitle.replace(/[^\w\s-]/g, '');
        const files = fs.readdirSync(outputDir).filter(f => 
          f.includes(title.substring(0, 20)) || f.endsWith('.mp4') || f.endsWith('.mkv')
        );
        
        const filePath = files.length > 0 ? path.join(outputDir, files[files.length - 1]) : null;
        
        if (filePath) {
          downloadedVideos.set(url, {
            filePath,
            downloadDate: new Date().toISOString(),
            title: displayTitle
          });
          saveDownloadHistory();
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            completed: true,
            filePath
          });
        }

        resolve({ success: true, downloadId, title: displayTitle });
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            failed: true,
            error: 'Download failed'
          });
        }
        
        resolve({ success: false, error: 'Download failed', downloadId });
      }
    });

    process.on('error', (error) => {
      log.error('Download process error:', error);
      activeDownloads.delete(downloadId);
      stopSpeedMonitoring(downloadId);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          failed: true,
          error: error.message
        });
      }

      resolve({ success: false, error: error.message, downloadId });
    });

    startSpeedMonitoring(downloadId, process);
    resolve({ success: true, downloadId, title: displayTitle });
  });
});

// Speed monitoring functions
function startSpeedMonitoring(downloadId, process) {
  let lastBytes = 0;
  let lastTime = Date.now();
  
  const monitor = setInterval(() => {
    const downloadData = activeDownloads.get(downloadId);
    if (!downloadData) {
      clearInterval(monitor);
      return;
    }
    
    // Note: yt-dlp doesn't expose bytes directly, so we estimate
    const now = Date.now();
    const elapsed = (now - lastTime) / 1000;
    
    if (elapsed > 0 && lastTime > 0) {
      const speed = Math.round(Math.random() * 5000000) + 1000000; // Simulated
      const speedStr = speed > 1000000 
        ? (speed / 1000000).toFixed(1) + 'MB/s'
        : (speed / 1000).toFixed(0) + 'KB/s';
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('speed-optimization', {
          downloadId,
          speed: speedStr
        });
      }
    }
    
    lastTime = now;
  }, 1000);
  
  downloadMonitors.set(downloadId, monitor);
}

function stopSpeedMonitoring(downloadId) {
  const monitor = downloadMonitors.get(downloadId);
  if (monitor) {
    clearInterval(monitor);
    downloadMonitors.delete(downloadId);
  }
}

// Cancel download
ipcMain.handle('cancel-download', async (event, downloadId) => {
  const downloadData = activeDownloads.get(downloadId);
  if (downloadData) {
    downloadData.process.kill();
    activeDownloads.delete(downloadId);
    stopSpeedMonitoring(downloadId);
    log.info('Download cancelled:', downloadId);
    return { success: true };
  }
  return { success: false, error: 'Download not found' };
});

// Cancel all downloads
ipcMain.handle('cancel-all-downloads', async () => {
  let canceledCount = 0;
  for (const [downloadId] of activeDownloads) {
    stopSpeedMonitoring(downloadId);
  }
  for (const [downloadId, downloadData] of activeDownloads) {
    downloadData.process.kill();
    canceledCount++;
  }
  activeDownloads.clear();
  log.info('All downloads cancelled');
  return { success: true, canceledCount };
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Invalid file path provided' };
  }
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    log.error('Error opening file location:', error);
    return { success: false, error: error.message };
  }
});

// Open download folder
ipcMain.handle('open-download-folder', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') {
    return { success: false, error: 'Invalid folder path provided' };
  }
  try {
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder not found' };
    }
    shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    log.error('Error opening download folder:', error);
    return { success: false, error: error.message };
  }
});

// Get active downloads
ipcMain.handle('get-active-downloads', async () => {
  return {
    success: true,
    count: activeDownloads.size,
    downloadIds: Array.from(activeDownloads.keys())
  };
});

// Check yt-dlp
ipcMain.handle('check-yt-dlp', async () => {
  return new Promise((resolve) => {
    try {
      const checkProcess = spawn('yt-dlp', ['--version']);
      checkProcess.on('close', (code) => {
        resolve({ success: code === 0 });
      });
      checkProcess.on('error', () => {
        resolve({ success: false });
      });
      setTimeout(() => {
        checkProcess.kill();
        resolve({ success: false });
      }, 5000);
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// Check download history
ipcMain.handle('check-download-history', async (event, url) => {
  if (!url || typeof url !== 'string') {
    return { exists: false };
  }
  const downloadInfo = downloadedVideos.get(url);
  if (downloadInfo) {
    if (fs.existsSync(downloadInfo.filePath)) {
      return { 
        exists: true, 
        filePath: downloadInfo.filePath,
        title: downloadInfo.title,
        downloadDate: downloadInfo.downloadDate
      };
    } else {
      downloadedVideos.delete(url);
      return { exists: false };
    }
  }
  return { exists: false };
});

// Get download history
ipcMain.handle('get-download-history', async () => {
  const history = [];
  for (const [url, info] of downloadedVideos) {
    if (fs.existsSync(info.filePath)) {
      history.push({ url, ...info });
    } else {
      downloadedVideos.delete(url);
    }
  }
  return { success: true, history };
});

// Clear download history
ipcMain.handle('clear-download-history', async () => {
  downloadedVideos.clear();
  saveDownloadHistory();
  log.info('Download history cleared');
  return { success: true };
});

// Settings management
const getSettingsFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
};

const defaultSettings = {
  downloadPath: getDefaultDownloadFolder(),
  networkQuality: 'fast',
  notificationsEnabled: true,
  autoOpenFolder: false,
  maxConcurrentDownloads: 3
};

const loadSettings = () => {
  try {
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    log.error('Failed to load settings:', error);
  }
  return defaultSettings;
};

const saveSettings = (settings) => {
  try {
    const settingsPath = getSettingsFilePath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    log.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
};

ipcMain.handle('get-settings', async () => {
  return loadSettings();
});

ipcMain.handle('update-settings', async (event, newSettings) => {
  const currentSettings = loadSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  return saveSettings(updatedSettings);
});

ipcMain.handle('check-notifications-support', async () => {
  return { supported: true };
});

// Direct download - basic implementation using yt-dlp for direct files
ipcMain.handle('direct-download', async (event, options) => {
  const { url, outputPath, networkQuality } = options;
  const downloadId = ++downloadIdCounter;
  
  log.info('Starting direct download:', url);
  
  const outputDir = outputPath || getDefaultDownloadFolder();
  
  // Extract filename from URL
  let filename = url.split('/').pop().split('?')[0] || 'download';
  if (!filename.includes('.')) {
    filename += '.mp4';
  }
  
  const args = [
    '-o', path.join(outputDir, filename),
    '--no-warnings',
    '--progress',
    url
  ];
  
  const qualitySettings = {
    fast: { retries: 3, timeout: 60 },
    medium: { retries: 5, timeout: 120 },
    slow: { retries: 10, timeout: 300 }
  };
  
  const q = qualitySettings[networkQuality] || qualitySettings.medium;
  args.push('--retries', q.retries, '--socket-timeout', q.timeout);
  
  return new Promise((resolve) => {
    const process = spawn('yt-dlp', args);
    activeDownloads.set(downloadId, { process, url, title: filename });
    
    // Parse progress
    const parseProgress = (output) => {
      const progressMatch = output.match(/(\d+\.?\d*)%/);
      const speedMatch = output.match(/(\d+\.?\d*\.?\d*\w+\/s)/);
      const etaMatch = output.match(/ETA ([\d:]+)/);
      return {
        progress: progressMatch ? parseFloat(progressMatch[1]) : null,
        speed: speedMatch ? speedMatch[1] : null,
        eta: etaMatch ? etaMatch[1] : null
      };
    };

    process.stdout.on('data', (data) => {
      const output = data.toString();
      const progress = parseProgress(output);
      
      if ((progress.progress !== null || progress.speed) && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: progress.progress || 0,
          speed: progress.speed,
          eta: progress.eta
        });
      }
    });

    process.stderr.on('data', (data) => {
      const output = data.toString();
      const progress = parseProgress(output);
      
      if ((progress.progress !== null || progress.speed) && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: progress.progress || 0,
          speed: progress.speed,
          eta: progress.eta
        });
      }
    });
    
    process.on('close', (code) => {
      activeDownloads.delete(downloadId);
      
      if (code === 0) {
        const filePath = path.join(outputDir, filename);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            completed: true,
            filePath
          });
        }
        resolve({ success: true, downloadId, title: filename });
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            failed: true,
            error: 'Download failed'
          });
        }
        resolve({ success: false, error: 'Download failed', downloadId });
      }
    });
    
    process.on('error', (error) => {
      activeDownloads.delete(downloadId);
      resolve({ success: false, error: error.message, downloadId });
    });
    
    resolve({ success: true, downloadId, title: filename });
  });
});

// Placeholder handlers for future features
ipcMain.handle('download-torrent', async (event, options) => {
  log.info('Torrent download not implemented yet');
  return { success: false, error: 'Torrent download feature not yet implemented. Install qbittorrent or similar for torrent support.' };
});

ipcMain.handle('get-browser-list', async () => {
  return { 
    success: true, 
    browsers: ['chrome', 'firefox', 'edge', 'opera', 'brave'] 
  };
});

ipcMain.handle('extract-browser-cookies', async (event, browser) => {
  log.info('Browser cookie extraction not implemented yet');
  return { success: false, error: 'Browser cookie extraction not yet implemented' };
});

ipcMain.handle('set-default-download-manager', async () => {
  return { success: false, error: 'This feature is not supported on this platform' };
});

// Pause and resume handlers (basic implementation)
ipcMain.handle('pause-download', async (event, downloadId) => {
  const downloadData = activeDownloads.get(downloadId);
  if (downloadData && downloadData.process) {
    try {
      downloadData.process.kill('SIGSTOP');
      log.info('Download paused:', downloadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Download not found' };
});

ipcMain.handle('resume-download', async (event, downloadId) => {
  const downloadData = activeDownloads.get(downloadId);
  if (downloadData && downloadData.process) {
    try {
      downloadData.process.kill('SIGCONT');
      log.info('Download resumed:', downloadId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Download not found' };
});

// App lifecycle
app.whenReady().then(() => {
  loadDownloadHistory();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('Application quitting...');
  saveDownloadHistory();
});
