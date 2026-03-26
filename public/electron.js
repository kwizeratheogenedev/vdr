const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
// we occasionally need sync spawns when probing yt-dlp capabilities
const { spawn, spawnSync } = require('child_process');

// Initialize Winston logger
const log = require('./logger');

// Override console methods to use Winston
console.log = (...args) => log.info(...args);
console.info = (...args) => log.info(...args);
console.warn = (...args) => log.warn(...args);
console.error = (...args) => log.error(...args);
console.debug = (...args) => log.debug(...args);


log.info('Application starting...', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version
});

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

// yt-dlp feature flags
let impersonateSupported = false; // true when "chrome" impersonation is available

// helper that will push impersonation args only when supported
function addImpersonateArgs(args) {
  if (impersonateSupported) {
    args.push('--impersonate', 'chrome');
    args.push('--extractor-args', 'generic:impersonate=chrome');
  }
}

// run a quick synchronous probe at startup so we have a guess before the UI asks
function initImpersonateSupport() {
  try {
    const res = spawnSync('yt-dlp', ['--list-impersonate-targets'], { encoding: 'utf8' });
    if (res.stdout) {
      // look for chrome entry that isn't marked unavailable
      const lower = res.stdout.toLowerCase();
      if (lower.includes('chrome') && !lower.includes('unavailable')) {
        impersonateSupported = true;
        log.info('yt-dlp impersonate support available');
      }
    }
  } catch (e) {
    // ignore – we will refresh when check-yt-dlp is called
  }
}

initImpersonateSupport();

// Default download manager protocols we want to handle
const DEFAULT_DOWNLOAD_PROTOCOLS = ['magnet', 'torrent'];

const isDefaultDownloadManager = () => {
  try {
    return DEFAULT_DOWNLOAD_PROTOCOLS.every(proto => app.isDefaultProtocolClient(proto));
  } catch (e) {
    return false;
  }
};

const setDefaultDownloadManager = () => {
  const isDev = !app.isPackaged;
  const results = {};

  if (isDev) {
    // In development mode, protocol registration doesn't work
    log.info('Cannot set default download manager in development mode - app must be packaged');
    for (const proto of DEFAULT_DOWNLOAD_PROTOCOLS) {
      results[proto] = false;
    }
    return { results, isDev: true, message: 'Cannot register protocols in development mode. Package the app first.' };
  }

  for (const proto of DEFAULT_DOWNLOAD_PROTOCOLS) {
    try {
      results[proto] = app.setAsDefaultProtocolClient(proto);
    } catch (e) {
      log.error(`Failed to register protocol ${proto}:`, e.message);
      results[proto] = false;
    }
  }
  return { results, isDev: false };
};

// Get default download folder
const getDefaultDownloadFolder = () => {
  return app.getPath('downloads') || path.join(app.getPath('home'), 'Downloads');
};


// Get output directory for downloads
const getOutputDir = (outputPath) => {
  if (outputPath && typeof outputPath === 'string') {
    try {
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        return outputPath;
      }
    } catch (e) {}
  }
  return getDefaultDownloadFolder();
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
  'agasobanuyefilms.com',
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
  'kannywood.com', 'nollywood.com', 'ghanaflicks.com',
  'igiti.net',
  'capcut.com', 'evercloud.capcut.com', 'sg-gcp-media.evercloud.capcut.com',
  'myactivity.google.com', 'takeout.google.com'
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
    const hostname = url.hostname.toLowerCase().replace(/^www\\./, '');
    const isSupported = SUPPORTED_PLATFORMS.some(platform => 
      hostname === platform || hostname.endsWith('.' + platform)
    );
    
    // Log for debugging
    log.info('Hostname:', hostname, 'isSupported:', isSupported);
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

ipcMain.handle('is-default-download-manager', () => {
  return { success: true, isDefault: isDefaultDownloadManager() };
});

ipcMain.handle('set-default-download-manager', () => {
  const { results, isDev, message } = setDefaultDownloadManager();
  const success = Object.values(results).every(Boolean);

  if (isDev) {
    log.warn('Attempted to set default download manager in development mode');
    return {
      success: false,
      results,
      isDev: true,
      message: message || 'Cannot register protocols in development mode. Package the app first.'
    };
  }

  if (success) {
    log.info('Set as default download manager for protocols:', Object.keys(results).join(', '));
  } else {
    log.warn('Failed to set default download manager for some protocols:', results);
  }
  return { success, results, isDev: false };
});

ipcMain.handle('is-packaged', () => {
  return app.isPackaged;
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

// Clipboard operations
ipcMain.handle('copy-to-clipboard', (event, text) => {
  if (typeof text === 'string' && text.trim()) {
    clipboard.writeText(text.trim());
    log.info('Copied to clipboard:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    return { success: true };
  }
  return { success: false, error: 'Invalid text to copy' };
});

ipcMain.handle('read-from-clipboard', () => {
  const text = clipboard.readText();
  return { success: true, text };
});

// Video info
ipcMain.handle('get-video-info', async (event, url) => {
  log.info('Getting video info for:', url);
  
  const validation = isValidVideoUrl(url);
  log.info('Validation result:', JSON.stringify(validation));
  if (!validation.valid) {
    log.warn('URL validation failed:', validation.error);
    return { success: false, error: validation.error };
  }

  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--no-check-certificate'
    ];
    addImpersonateArgs(args);
    args.push(url);

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
  // Validate input
  if (!options || typeof options !== 'object') {
    return { success: false, error: 'Invalid options object' };
  }
  const { url, format, quality, outputPath, networkQuality, videoInfo } = options;
  
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'URL is required' };
  }
  const downloadId = ++downloadIdCounter;
  const outputDir = getOutputDir(outputPath);
  
  log.info('Starting download:', {
    downloadId,
    url,
    format: format ? format.format_id : 'best',
    quality,
    outputPath: outputDir
  });
  
  // Initialize progress tracker
  downloadProgressTracker.set(downloadId, {
    startTime: Date.now(),
    lastUpdate: Date.now(),
    lastBytes: 0,
    speedSamples: []
  });

  
  // Build yt-dlp arguments
  const args = [
    '-f', format ? format.format_id : 'best',
    '-o', path.join(outputDir, '%(title)s.%(ext)s'),
    '--no-warnings',
    '--no-check-certificate',
    '--add-header', 'Referer:https://web.wootly.ch/'
  ];
  addImpersonateArgs(args);
  
  // Add specific headers for wootly source URLs
  if (url.includes('web.wootly.ch/source')) {
    args.push('--add-header', 'Origin:https://web.wootly.ch');
  }
  
  // Add specific headers for CapCut evercloud URLs
  if (url.includes('evercloud.capcut.com') || url.includes('capcut.com')) {
    args.push('--add-header', 'Referer:https://www.capcut.com/');
  }
  
  // Add specific headers for Google download history URLs
  if (url.includes('myactivity.google.com') || url.includes('takeout.google.com')) {
    args.push('--add-header', 'Referer:https://myactivity.google.com/');
  }
  
  // Add specific headers for igiti.net
  if (url.includes('igiti.net')) {
    args.push('--add-header', 'Referer:https://www.igiti.net/');
    args.push('--add-header', 'Origin:https://www.igiti.net');
    args.push('--add-header', 'Sec-Fetch-Dest:document');
    args.push('--add-header', 'Sec-Fetch-Mode:navigate');
    args.push('--add-header', 'Sec-Fetch-Site:same-origin');
    args.push('--add-header', 'Sec-Fetch-User:?1');
    // Try to bypass some anti-bot protections
    args.push('--no-check-certificate');
  }
  
  args.push('--progress', url);

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
      const percentMatch = output.match(/([0-9.]+)%/);
      if (percentMatch) {
        progress = parseFloat(percentMatch[1]);
      }
      
      // Extract speed - look for patterns like "5.2MiB/s", "1.5MB/s", "500k/s", "1M/s"
      // More lenient patterns to catch any speed format
      const speedPatterns = [
        /at\s+([0-9.]+\s*[KMGTkmgt]i?B?\/s)/i,       // "at 5.2MiB/s" or "at 1M/s"
        /([0-9.]+\s*[KMGTkmgt]i?B?\/s)\s+ETA/i,       // "5.2MiB/s ETA"
        /([0-9.]+\s*[KMGTkmgt]i?B?\/s)\s+\(/i,        // "5.2MiB/s ("
        /([0-9.]+\s*[kKmMgG][bB]?\/s)/i               // "5M/s", "500k/s", "1.5G/s"
      ];
      for (const pattern of speedPatterns) {
        const match = output.match(pattern);
        if (match) {
          speed = match[1].trim();
          break;
        }
      }
      
      // Fallback: look for any number followed by /s anywhere in the line
      if (!speed) {
        const fallbackMatch = output.match(/([0-9.]+\s*[KMGTkmgt]i?B?\/s)/i);
        if (fallbackMatch) {
          speed = fallbackMatch[1].trim();
        }
      }
      
      // Extract ETA
      const etaPatterns = [
        /ETA\s+([0-9:]+)/i,
        /(\d+:\d+:\d+)/,
        /remaining\s+([0-9:]+)/i
      ];
      for (const pattern of etaPatterns) {
        const match = output.match(pattern);
        if (match) {
          eta = match[1];
          break;
        }
      }
      
      // Extract downloaded size
      const sizeMatch = output.match(/of\s+([0-9.]+\s*[KMGT]?i?B)/i);
      if (sizeMatch) {
        downloadedSize = sizeMatch[1].trim();
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
      // Store speed from yt-dlp for monitoring
      if (speed) {
        const tracker = downloadProgressTracker.get(downloadId);
        if (tracker) {
          tracker.lastSpeed = speed;
        }
      }
      if (!speed && progress.downloadedSize) {
        const tracker = downloadProgressTracker.get(downloadId);
        if (tracker) {
          const now = Date.now();
          const timeDiff = (now - tracker.lastUpdate) / 1000; // seconds
          if (timeDiff >= 1) { // Calculate speed every second
            // Estimate: parse downloaded size and calculate speed
            const sizeMatch = progress.downloadedSize.match(/([0-9.]+)/);
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
                tracker.lastSpeed = speed;  // Store for speed monitoring
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
        const title = displayTitle.replace(/[^a-zA-Z0-9.-]/g, '');
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

    startSpeedMonitoring(downloadId);
    resolve({ success: true, downloadId, title: displayTitle });
  });
});

// Speed monitoring functions - uses actual download progress data
function startSpeedMonitoring(downloadId) {
  const monitor = setInterval(() => {
    const tracker = downloadProgressTracker.get(downloadId);
    if (!tracker) {
      clearInterval(monitor);
      return;
    }
    
    // Use actual speed from tracker if available
    if (tracker.lastSpeed) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('speed-optimization', {
          downloadId,
          speed: tracker.lastSpeed
        });
      }
    }
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

// Check yt-dlp and re‑evaluate impersonate support
ipcMain.handle('check-yt-dlp', async () => {
  return new Promise((resolve) => {
    try {
      const checkProcess = spawn('yt-dlp', ['--version']);
      checkProcess.on('close', (code) => {
        // probe impersonate support on every check so we keep state up to date
        try {
          const res = spawnSync('yt-dlp', ['--list-impersonate-targets'], { encoding: 'utf8' });
          impersonateSupported = false;
          if (res.stdout) {
            const lower = res.stdout.toLowerCase();
            if (lower.includes('chrome') && !lower.includes('unavailable')) {
              impersonateSupported = true;
            }
          }
        } catch (e) {
          // ignore
        }
        resolve({ success: code === 0, impersonate: impersonateSupported });
      });
      checkProcess.on('error', () => {
        resolve({ success: false, impersonate: false });
      });
      setTimeout(() => {
        checkProcess.kill();
        resolve({ success: false, impersonate: impersonateSupported });
      }, 5000);
    } catch (error) {
      resolve({ success: false, error: error.message, impersonate: false });
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
  // Validate input
  if (!options || typeof options !== 'object') {
    return { success: false, error: 'Invalid options object' };
  }
  const { url, outputPath, networkQuality } = options;
  
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'URL is required' };
  }
  
  const downloadId = ++downloadIdCounter;
  log.info('Starting direct download:', url);
  
  const outputDir = getOutputDir(outputPath);
  
  // Check if this is a MediaFire URL
  const isMediaFire = url.toLowerCase().includes('mediafire.com');
  const isMega = url.toLowerCase().includes('mega.nz');
  const isDropbox = url.toLowerCase().includes('dropbox.com');
  const isGoogleDrive = url.toLowerCase().includes('drive.google.com') || url.toLowerCase().includes('docs.google.com');
  const isOneDrive = url.toLowerCase().includes('onedrive.live.com');
  const isPcloud = url.toLowerCase().includes('pcloud.com');
  
  // Extract filename from URL (for non-special hosting services)
  let filename = 'download';
  if (!isMediaFire && !isMega && !isDropbox && !isGoogleDrive && !isOneDrive && !isPcloud) {
    filename = url.split('/').pop().split('?')[0] || 'download';
    if (!filename.includes('.') || filename === 'download') {
      filename = '%(title)s.%(ext)s';
    }
  } else {
    filename = '%(title)s.%(ext)s';
  }
  
  const args = [
    '-o', path.join(outputDir, filename),
    '--no-warnings',
    '--progress',
    '--no-check-certificate',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  
  // Add specific headers for MediaFire
  if (isMediaFire) {
    args.push('--add-header', 'Referer: https://www.mediafire.com/');
    args.push('--extractor-args', 'mediafire:mobile=false');
  }
  
  // Add specific headers for Mega
  if (isMega) {
    args.push('--add-header', 'Referer: https://mega.nz/');
  }
  
  // Add specific headers for Dropbox
  if (isDropbox) {
    args.push('--add-header', 'Referer: https://www.dropbox.com/');
  }
  
  // Add specific headers for Google Drive
  if (isGoogleDrive) {
    args.push('--add-header', 'Referer: https://drive.google.com/');
  }
  
  // Add specific headers for OneDrive
  if (isOneDrive) {
    args.push('--add-header', 'Referer: https://onedrive.live.com/');
  }
  
  // Add specific headers for pCloud
  if (isPcloud) {
    args.push('--add-header', 'Referer: https://www.pcloud.com/');
  }
  
  // Add URL as last argument
  args.push(url);
  
  const qualitySettings = {
    fast: { retries: 3, timeout: 60 },
    medium: { retries: 5, timeout: 120 },
    slow: { retries: 10, timeout: 300 }
  };
  
  const q = qualitySettings[networkQuality] || qualitySettings.medium;
  args.push('--retries', q.retries, '--socket-timeout', q.timeout);
  
  return new Promise((resolve) => {
    log.info('Running yt-dlp with args:', args.join(' '));
    const process = spawn('yt-dlp', args);
    activeDownloads.set(downloadId, { process, url, title: isMediaFire ? 'MediaFire Download' : (isMega ? 'Mega Download' : 'Direct Download') });
    
    // Parse progress
    const parseProgress = (output) => {
      const progressMatch = output.match(/([0-9.]+)%/);
      const speedMatch = output.match(/at\s+([0-9.]+\s*[KMGTkmgt]i?B?\/s)/i);
      const etaMatch = output.match(/ETA\s+([0-9:]+)/i);
      return {
        progress: progressMatch ? parseFloat(progressMatch[1]) : null,
        speed: speedMatch ? speedMatch[1].trim() : null,
        eta: etaMatch ? etaMatch[1] : null
      };
    };

    let errorOutput = '';

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
      errorOutput += output;
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
        log.info('Download completed successfully', {
          downloadId,
          filePath,
          finalFilename: filename
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            completed: true,
            filePath
          });
        }
        resolve({ success: true, downloadId, title: 'Download Complete' });
      } else {
        log.error('Download failed', {
          downloadId,
          exitCode: code,
          errorOutput: errorOutput.substring(0, 500) // Limit error output length
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            failed: true,
            error: errorOutput || 'Download failed'
          });
        }
        resolve({ success: false, error: errorOutput || 'Download failed', downloadId });
      }
    });
    
    process.on('error', (error) => {
      activeDownloads.delete(downloadId);
      log.error('Process error:', error.message);
      resolve({ success: false, error: error.message, downloadId });
    });
    
    resolve({ success: true, downloadId, title: 'Download Started' });
  });
});

// Universal Download - Downloads any file or extracts media from any website
ipcMain.handle('universal-download', async (event, options) => {
  // Validate input
  if (!options || typeof options !== 'object') {
    return { success: false, error: 'Invalid options object' };
  }
  const { url, outputPath, networkQuality, downloadAll = true } = options;
  
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'URL is required' };
  }
  
  const downloadId = ++downloadIdCounter;
  log.info('Starting universal download:', url);
  
  const outputDir = getOutputDir(outputPath);
  
  // Check if URL is a direct file (image, video, audio, document)
  const directFileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff',
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mp3',
    '.wav', '.flac', '.aac', '.ogg', '.wma', '.pdf', '.doc', '.docx', '.zip',
    '.rar', '.7z', '.tar', '.gz', '.exe', '.apk', '.iso'
  ];
  
  const urlLower = url.toLowerCase();
  const isDirectFile = directFileExtensions.some(ext => urlLower.endsWith(ext));
  const isMediafire = urlLower.includes('mediafire.com');
  const isMega = urlLower.includes('mega.nz');
  const isPinterest = urlLower.includes('pinterest.com') || urlLower.includes('i.pinimg.com');
  
  // Build yt-dlp arguments
  const args = [];
  
  if (isDirectFile && !isPinterest) {
    // Direct file download - use simple approach (but not for Pinterest)
    let filename = url.split('/').pop().split('?')[0] || 'download';
    args.push('-o', path.join(outputDir, filename));
  } else if (isMediafire || isMega || isPinterest) {
    // File hosting services and Pinterest - use extractor
    args.push('-o', path.join(outputDir, '%(title)s.%(ext)s'));
    // For hosted file links (MediaFire/Mega/pinterest) we do not force audio extraction.
    // This ensures application binaries and archives download correctly.
    if (isMediafire) {
      args.push('--add-header', 'Referer: https://www.mediafire.com/');
    }
    if (isMega) {
      args.push('--add-header', 'Referer: https://mega.nz/');
    }
    // Pinterest doesn't need special headers, yt-dlp handles it
  } else {
    // Webpage - extract all media (images, videos, audio)
    args.push('-o', path.join(outputDir, '%(title)s.%(ext)s'));
    // For generic websites, try to extract best quality
    addImpersonateArgs(args);

    if (downloadAll) {
      // when user wants "everything", also fetch thumbnails, info etc
      args.push('--write-all-thumbnails', '--write-info-json', '--write-description', '--write-annotations');
    }
  }
  
  // Common options - use compatible options
  args.push(
    '--no-warnings',
    '--no-check-certificate',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--retries', '5',
    '--socket-timeout', '120',
    '--quiet',
    url
  );
  
  return new Promise((resolve) => {
    log.info('Running universal download with yt-dlp args:', args.join(' '));
    const process = spawn('yt-dlp', args);
    activeDownloads.set(downloadId, { process, url, title: 'Universal Download' });
    
    let errorOutput = '';
    let downloadedFiles = [];
    
    const parseProgress = (output) => {
      const progressMatch = output.match(/([0-9.]+)%/);
      const speedMatch = output.match(/at\s+([0-9.]+\s*[KMGTkmgt]i?B?\/s)/i);
      const etaMatch = output.match(/ETA\s+([0-9:]+)/i);
      const filenameMatch = output.match(/\[download\]\s+Destination:\s+(.+)/);
      
      if (filenameMatch) {
        downloadedFiles.push(filenameMatch[1].trim());
      }
      
      return {
        progress: progressMatch ? parseFloat(progressMatch[1]) : null,
        speed: speedMatch ? speedMatch[1].trim() : null,
        eta: etaMatch ? etaMatch[1] : null,
        filename: filenameMatch ? filenameMatch[1] : null
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
          filename: progress.filename
        });
      }
    });

    process.stderr.on('data', (data) => {
      const output = data.toString();
      errorOutput += output;
      const progress = parseProgress(output);
      
      if ((progress.progress !== null || progress.speed) && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: progress.progress || 0,
          speed: progress.speed,
          eta: progress.eta,
          filename: progress.filename
        });
      }
    });
    
    process.on('close', (code) => {
      activeDownloads.delete(downloadId);
      
      if (code === 0 || downloadedFiles.length > 0) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            completed: true,
            filePath: downloadedFiles.length > 0 ? downloadedFiles[0] : outputDir
          });
        }
        resolve({ 
          success: true, 
          downloadId, 
          title: 'Download Complete',
          files: downloadedFiles
        });
      } else {
        log.error('Universal download failed:', errorOutput);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            downloadId,
            failed: true,
            error: errorOutput || 'Download failed'
          });
        }
        resolve({ success: false, error: errorOutput || 'Download failed', downloadId });
      }
    });
    
    process.on('error', (error) => {
      activeDownloads.delete(downloadId);
      log.error('Universal download error:', error.message);
      resolve({ success: false, error: error.message, downloadId });
    });
    
    resolve({ success: true, downloadId, title: 'Download Started' });
  });
});

// Extract media info from any URL (for universal downloads)
ipcMain.handle('get-universal-info', async (event, url) => {
  log.info('Getting universal info for:', url);
  
  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--no-check-certificate'
    ];
    addImpersonateArgs(args);
    args.push(url);
    
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
      if (code === 0 && output) {
        try {
          const info = JSON.parse(output);
          resolve({ success: true, info });
        } catch (e) {
          resolve({ success: true, info: { url, title: 'Unknown' } });
        }
      } else {
        // Still return success with basic info
        resolve({ success: true, info: { url, title: 'Unknown', error: errorOutput } });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
});

// Download image using Node.js HTTP/HTTPS for direct downloads
ipcMain.handle('download-image', async (event, options) => {
  const { url, outputPath } = options;
  const downloadId = ++downloadIdCounter;
  
  log.info('Starting image download:', url);
  
  const outputDir = getOutputDir(outputPath);
  const https = require('https');
  const http = require('http');
  const fs = require('fs');
  
  return new Promise((resolve) => {
    try {
      // Skip Pinterest URLs - they should use universal download instead
      if (url.includes('pinterest.com') || url.includes('i.pinimg.com')) {
        log.info('Pinterest URL detected in download-image, redirecting to universal download');
        resolve({ success: false, error: 'Use universal download for Pinterest URLs', downloadId });
        return;
      }
      
      // Convert other image URLs to high quality if possible
      let downloadUrl = url;
      // Add more quality conversion logic here for other sites if needed
      
      const urlObj = new URL(downloadUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      // Extract filename from URL
      let filename = urlObj.pathname.split('/').pop() || 'image';
      if (!filename.includes('.')) {
        filename += '.jpg'; // Default extension if none provided
      }
      
      const filePath = path.join(outputDir, filename);
      const fileStream = fs.createWriteStream(filePath);
      
      const request = protocol.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': urlObj.origin
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          fileStream.close();
          fs.unlink(filePath, () => {});
          resolve({ success: false, error: `HTTP ${response.statusCode}`, downloadId });
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);
          
          if (totalSize > 0 && mainWindow && !mainWindow.isDestroyed()) {
            const progress = (downloadedSize / totalSize) * 100;
            mainWindow.webContents.send('download-progress', {
              downloadId,
              progress: Math.round(progress),
              speed: 'N/A',
              eta: 'N/A'
            });
          }
        });
        
        response.on('end', () => {
          fileStream.end();
          activeDownloads.delete(downloadId);
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              downloadId,
              completed: true,
              filePath
            });
          }
          
          resolve({ success: true, downloadId, title: filename });
        });
        
        response.on('error', (error) => {
          fileStream.close();
          fs.unlink(filePath, () => {});
          activeDownloads.delete(downloadId);
          resolve({ success: false, error: error.message, downloadId });
        });
      });
      
      request.on('error', (error) => {
        fileStream.close();
        fs.unlink(filePath, () => {});
        activeDownloads.delete(downloadId);
        resolve({ success: false, error: error.message, downloadId });
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        fileStream.close();
        fs.unlink(filePath, () => {});
        activeDownloads.delete(downloadId);
        resolve({ success: false, error: 'Request timeout', downloadId });
      });
      
      activeDownloads.set(downloadId, { process: null, url, title: filename });
      
    } catch (error) {
      resolve({ success: false, error: error.message, downloadId });
    }
  });
});

// Get image information (dimensions, size, format, etc.)
ipcMain.handle('get-image-info', async (event, url) => {
  const https = require('https');
  const http = require('http');
  
  return new Promise((resolve) => {
    try {
      // For Pinterest URLs, use yt-dlp to get info
      if (url.includes('pinterest.com') || url.includes('i.pinimg.com')) {
        log.info('Getting Pinterest image info via yt-dlp');
        const args = [
          '--dump-json',
          '--no-download',
          '--no-warnings',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '--no-check-certificate'
        ];
        addImpersonateArgs(args);
        args.push(url);
        
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
          if (code === 0 && output) {
            try {
              const info = JSON.parse(output);
              resolve({ 
                success: true, 
                info: {
                  url,
                  filename: info.title || 'Pinterest Image',
                  contentType: 'image/jpeg', // Assume JPEG for Pinterest
                  size: null,
                  lastModified: null,
                  estimatedDimensions: null
                }
              });
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse yt-dlp output' });
            }
          } else {
            resolve({ success: false, error: errorOutput || 'yt-dlp failed' });
          }
        });
        
        process.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
        return;
      }
      
      // For non-Pinterest URLs, use HEAD request
      // Convert Pinterest URLs to high quality for info
      let infoUrl = url;
      if (url.includes('i.pinimg.com')) {
        infoUrl = url.replace(/\\.[0-9]+x\\./, '/originals/');
      }
      
      const urlObj = new URL(infoUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const request = protocol.request(infoUrl, {
        method: 'HEAD', // HEAD request to get headers without downloading
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': urlObj.origin
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          resolve({ success: false, error: `HTTP ${response.statusCode}` });
          return;
        }
        
        const contentType = response.headers['content-type'] || '';
        const contentLength = response.headers['content-length'];
        const lastModified = response.headers['last-modified'];
        
        // Extract filename
        let filename = urlObj.pathname.split('/').pop() || 'image';
        if (!filename.includes('.')) {
          // Try to determine extension from content-type
          if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            filename += '.jpg';
          } else if (contentType.includes('png')) {
            filename += '.png';
          } else if (contentType.includes('gif')) {
            filename += '.gif';
          } else if (contentType.includes('webp')) {
            filename += '.webp';
          } else if (contentType.includes('svg')) {
            filename += '.svg';
          } else {
            filename += '.jpg'; // Default
          }
        }
        
        const info = {
          url: infoUrl,
          filename,
          contentType,
          size: contentLength ? parseInt(contentLength, 10) : null,
          lastModified,
          // For Pinterest, we can estimate dimensions from URL pattern
          estimatedDimensions: null
        };
        
        if (url.includes('i.pinimg.com')) {
          // Pinterest URL patterns give us dimensions
          const match = url.match(/\\.([0-9]+)x([0-9]+)\\./);
          if (match) {
            info.estimatedDimensions = {
              width: parseInt(match[1], 10),
              height: parseInt(match[2], 10)
            };
          } else if (url.includes('/originals/')) {
            info.estimatedDimensions = { width: 'Original', height: 'Original' };
          }
        }
        
        resolve({ success: true, info });
      });
      
      request.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
      
      request.end();
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// Rename a downloaded file
ipcMain.handle('rename-file', async (event, options) => {
  const { filePath, newTitle } = options;
  const fs = require('fs');
  const path = require('path');
  
  return new Promise((resolve) => {
    try {
      if (!filePath || !newTitle) {
        resolve({ success: false, error: 'Invalid parameters' });
        return;
      }
      
      // Get the directory and current filename
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const newFileName = newTitle + ext;
      const newFilePath = path.join(dir, newFileName);
      
      // Check if the new file already exists
      if (fs.existsSync(newFilePath)) {
        resolve({ success: false, error: 'A file with this name already exists' });
        return;
      }
      
      // Rename the file
      fs.rename(filePath, newFilePath, (error) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, newFilePath });
        }
      });
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// Get log files list and content
// Forward renderer console messages into Winston so all logs live in one place
ipcMain.on('renderer-log', (event, { level, message, meta }) => {
  if (!level || !message) return;
  if (typeof log[level] === 'function') {
    log[level](message, meta);
  } else {
    log.info(message, meta);
  }
});

ipcMain.handle('get-logs-path', () => {
  return logsPath;
});

ipcMain.handle('get-log-files', async () => {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      return { success: false, error: 'Logs directory not found' };
    }

    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          path: filePath
        };
      })
      .sort((a, b) => b.modified - a.modified);

    return { success: true, files };
  } catch (error) {
    log.error('Failed to get log files:', error);
    return { success: false, error: error.message };
  }
});

// Get log file content
ipcMain.handle('get-log-content', async (event, filename) => {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    const filePath = path.join(logsDir, filename);

    // Security check - only allow log files
    if (!filename.endsWith('.log') || !fs.existsSync(filePath)) {
      return { success: false, error: 'Invalid log file' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    log.error('Failed to read log file:', error);
    return { success: false, error: error.message };
  }
});

// Clear old log files
ipcMain.handle('clear-old-logs', async (event, daysToKeep = 7) => {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      return { success: false, error: 'Logs directory not found' };
    }

    const files = fs.readdirSync(logsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          log.info('Deleted old log file:', file);
        }
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    log.error('Failed to clear old logs:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extract-browser-cookies', async (event, browser) => {
  log.info('Browser cookie extraction not implemented yet');
  return { success: false, error: 'Browser cookie extraction not yet implemented' };
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
// Make Electron write its own logs into our managed logs folder (same as Winston)
// Use app.getPath('userData') so logs are stored in a writable, per-user location.
const logsPath = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}
app.setAppLogsPath(logsPath);
log.info('Electron app log path set to', logsPath);

// Disable Chromium's default logging output; we log through Winston instead
app.commandLine.appendSwitch('--disable-logging');

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
