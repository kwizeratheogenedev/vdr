const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let activeDownloads = new Map(); // Track multiple downloads by ID
let downloadIdCounter = 0;

// Per-download speed monitoring with actual byte tracking
const downloadMonitors = new Map();

// Track downloaded videos to prevent duplicates
const downloadedVideos = new Map(); // Map of URL -> { filePath, downloadDate, title }

// Get default download folder (system Downloads folder)
const getDefaultDownloadFolder = () => {
  return app.getPath('downloads') || path.join(app.getPath('home'), 'Downloads');
};

// Supported video platforms for URL validation
const SUPPORTED_PLATFORMS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv',
  'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'instagram.com',
  'tiktok.com', 'reddit.com', 'streamable.com', 'ok.ru', 'vk.com',
  'bilibili.com', 'nicovideo.jp', 'soundcloud.com', 'bandcamp.com',
  'mediafire.com'
];

// Validate URL for security and supported platforms
const isValidVideoUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol. Only HTTP and HTTPS are allowed.' };
    }
    
    // Check if the hostname matches any supported platform
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const isSupported = SUPPORTED_PLATFORMS.some(platform => 
      hostname === platform || hostname.endsWith('.' + platform)
    );
    
    if (!isSupported) {
      return { valid: false, error: 'Unsupported video platform. Please use a supported platform like YouTube, Vimeo, etc.' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format.' };
  }
};

// Check if directory is writable
const isDirectoryWritable = (dirPath) => {
  try {
    // Try to write a test file
    const testFile = path.join(dirPath, '.write-test-' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { writable: true };
  } catch (error) {
    return { writable: false, error: error.message };
  }
};

// Path for persistent download history
const getHistoryFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'download-history.json');
};

// Load download history from disk
const loadDownloadHistory = () => {
  try {
    const historyPath = getHistoryFilePath();
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf8');
      const history = JSON.parse(data);
      // Restore as Map
      for (const [url, info] of Object.entries(history)) {
        downloadedVideos.set(url, info);
      }
    }
  } catch (error) {
    console.error('Failed to load download history:', error);
  }
};

// Save download history to disk
const saveDownloadHistory = () => {
  try {
    const historyPath = getHistoryFilePath();
    const historyObj = Object.fromEntries(downloadedVideos);
    fs.writeFileSync(historyPath, JSON.stringify(historyObj, null, 2));
  } catch (error) {
    console.error('Failed to save download history:', error);
  }
};

// Speed monitoring functions with actual byte tracking
const startSpeedMonitoring = (downloadId) => {
  let lastBytes = 0;
  let lastTime = Date.now();
  let lastSpeed = 0;
  
  const speedCheckInterval = setInterval(() => {
    const downloadData = activeDownloads.get(downloadId);
    if (!downloadData) {
      clearInterval(speedCheckInterval);
      downloadMonitors.delete(downloadId);
      return;
    }
    
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastTime) / 1000; // seconds
    const currentBytes = downloadData.downloadedBytes || 0;
    
    if (timeDiff >= 1) { // Check every second
      const bytesDiff = currentBytes - lastBytes;
      const speed = bytesDiff / timeDiff; // bytes per second
      
      // Calculate speed in human-readable format
      const formatSpeed = (bytesPerSec) => {
        if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
        if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
        return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
      };
      
      lastSpeed = speed;
      lastBytes = currentBytes;
      lastTime = currentTime;
      
      // Send speed update to frontend
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('speed-optimization', {
          downloadId,
          speed: formatSpeed(speed),
          downloadedBytes: currentBytes
        });
      }
    }
  }, 1000);
  
  downloadMonitors.set(downloadId, {
    interval: speedCheckInterval,
    lastBytes: 0,
    lastTime: Date.now()
  });
};

const stopSpeedMonitoring = (downloadId) => {
  const monitor = downloadMonitors.get(downloadId);
  if (monitor && monitor.interval) {
    clearInterval(monitor.interval);
    downloadMonitors.delete(downloadId);
  }
};

// Initialize download history on app ready
loadDownloadHistory();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Frameless window for custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e1e', // Match dark theme
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable webSecurity always for security
      webSecurity: true,
      // Don't allow insecure content
      allowRunningInsecureContent: false
    }
  });

  // In development, open DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3001' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  // Validate that build exists in production mode
  if (!isDev && !fs.existsSync(path.join(__dirname, '../build/index.html'))) {
    console.error('Build folder not found. Please run npm run build first.');
    dialog.showErrorBox('Build Not Found', 'Please run "npm run build" before running in production mode.');
    app.quit();
    return;
  }
  
  mainWindow.loadURL(startUrl);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Cleanup: Stop all active downloads before quitting
  for (const [downloadId, downloadData] of activeDownloads) {
    try {
      stopSpeedMonitoring(downloadId);
      downloadData.process.kill('SIGTERM');
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
  activeDownloads.clear();
  
  // Save download history before quitting
  saveDownloadHistory();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
// Window control handlers for frameless window
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
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Download Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, folderPath: result.filePaths[0] };
    }
    return { success: false, error: 'No folder selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-video-info', async (event, url) => {
  // Validate URL
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Invalid URL provided' };
  }
  
  // Validate URL for security and supported platforms
  const urlValidation = isValidVideoUrl(url);
  if (!urlValidation.valid) {
    return { success: false, error: urlValidation.error };
  }
  
  return new Promise((resolve) => {
    try {
      const ytDlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        url
      ]);

      let data = '';
      let errorData = '';

      ytDlp.stdout.on('data', (chunk) => {
        data += chunk.toString();
      });

      ytDlp.stderr.on('data', (chunk) => {
        errorData += chunk.toString();
      });

      ytDlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(data);
            resolve({ 
              success: true, 
              info: {
                title: info.title,
                duration: info.duration,
                uploader: info.uploader,
                thumbnail: info.thumbnail,
                formats: info.formats?.filter(f => f.ext && f.vcodec !== 'none') || [],
                description: info.description,
                upload_date: info.upload_date,
                view_count: info.view_count
              }
            });
          } catch (parseError) {
            resolve({ success: false, error: 'Failed to parse video info' });
          }
        } else {
          resolve({ 
            success: false, 
            error: errorData || 'Failed to fetch video info' 
          });
        }
      });

      ytDlp.on('error', (error) => {
        resolve({ success: false, error: error.message || 'Failed to start yt-dlp process' });
      });
    } catch (error) {
      resolve({ success: false, error: error.message || 'Unknown error occurred' });
    }
  });
});

// Helper function to check if a video file already exists in the download folder
const checkExistingVideoFile = (outputPath, videoTitle) => {
  try {
    if (!fs.existsSync(outputPath)) {
      return { exists: false };
    }
    
    const files = fs.readdirSync(outputPath);
    
    // Common video extensions
    const videoExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.mp3', '.m4a', '.opus', '.wav'];
    
    // Clean the video title for comparison (remove special characters)
    const cleanTitle = videoTitle ? videoTitle.toLowerCase().replace(/[^\w\s]/gi, '').substring(0, 50) : '';
    
    for (const file of files) {
      const fileExt = path.extname(file).toLowerCase();
      const fileName = path.basename(file, fileExt).toLowerCase().replace(/[^\w\s]/gi, '');
      
      // Check if it's a video file
      if (videoExtensions.includes(fileExt)) {
        // Check if the filename matches the video title
        if (cleanTitle && fileName.includes(cleanTitle.substring(0, 30))) {
          const filePath = path.join(outputPath, file);
          const stats = fs.statSync(filePath);
          // Only consider files larger than 1MB as valid video files
          if (stats.size > 1024 * 1024) {
            return {
              exists: true,
              filePath: filePath,
              fileName: file,
              fileSize: stats.size
            };
          }
        }
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking existing video file:', error);
    return { exists: false };
  }
};

ipcMain.handle('download-video', async (event, options) => {
  // Validate options
  if (!options || typeof options !== 'object') {
    return { success: false, error: 'Invalid options provided' };
  }
  
  if (!options.url || typeof options.url !== 'string') {
    return { success: false, error: 'Invalid URL provided' };
  }
  
  if (!options.outputPath || typeof options.outputPath !== 'string') {
    return { success: false, error: 'Invalid output path provided' };
  }
  
  // Validate URL for security and supported platforms
  const urlValidation = isValidVideoUrl(options.url);
  if (!urlValidation.valid) {
    return { success: false, error: urlValidation.error };
  }
  
  // Validate output directory exists
  if (!fs.existsSync(options.outputPath)) {
    return { success: false, error: 'Download folder does not exist' };
  }
  
  // Check if output directory is writable
  const permissionCheck = isDirectoryWritable(options.outputPath);
  if (!permissionCheck.writable) {
    return { success: false, error: `Download folder is not writable: ${permissionCheck.error}` };
  }
  
  // Get video title for checking
  const videoTitle = options.videoInfo?.title || options.format?.title || '';
  
  // Check if this URL is already being downloaded
  for (const [activeId, activeProcess] of activeDownloads) {
    if (activeProcess.url === options.url) {
      return { 
        success: false, 
        alreadyDownloading: true,
        error: 'This video is already being downloaded!',
        downloadId: activeId
      };
    }
  }
  
  // Check if video was already downloaded (in-memory history)
  const existingDownload = downloadedVideos.get(options.url);
  if (existingDownload) {
    // Check if file still exists
    if (fs.existsSync(existingDownload.filePath)) {
      return { 
        success: false, 
        alreadyExists: true,
        error: 'video already exist',
        filePath: existingDownload.filePath,
        title: existingDownload.title,
        downloadDate: existingDownload.downloadDate
      };
    } else {
      // File was deleted, remove from history and allow re-download
      downloadedVideos.delete(options.url);
    }
  }
  
  // Check if a file with the same video title already exists in the download folder
  if (videoTitle) {
    const existingFile = checkExistingVideoFile(options.outputPath, videoTitle);
    if (existingFile.exists) {
      return {
        success: false,
        alreadyExists: true,
        error: 'video already exist',
        filePath: existingFile.filePath,
        fileName: existingFile.fileName,
        title: videoTitle
      };
    }
  }
  
  // Generate unique download ID
  const downloadId = ++downloadIdCounter;
  
  // Use video title for display (already extracted above, or use fallback)
  const displayTitle = videoTitle || 'Downloading...';
  
  // Network quality settings - optimized for maximum speed
  const networkSettings = {
    // Fast network - maximum speed settings
    'fast': [
      '--retries', '3',
      '--fragment-retries', '3',
      '--no-abort-on-error',
      '--concurrent-fragments', '16', // Much higher for max speed
      '--buffer-size', '128K', // Larger buffer
      '--http-chunk-size', '32M' // Larger chunks
    ],
    // Medium network - balanced settings with optimization
    'medium': [
      '--retries', '5',
      '--fragment-retries', '5',
      '--no-abort-on-error',
      '--concurrent-fragments', '12', // Increased significantly
      '--buffer-size', '64K',
      '--http-chunk-size', '16M'
    ],
    // Slow network - optimized for stability with speed boost
    'slow': [
      '--retries', '10',
      '--fragment-retries', '10',
      '--no-abort-on-error',
      '--concurrent-fragments', '8', // Much higher
      '--buffer-size', '32K',
      '--http-chunk-size', '8M',
      '--extractor-retries', '5'
    ],
    // Very slow network - maximum reliability with speed optimization
    'very-slow': [
      '--retries', '20',
      '--fragment-retries', '20',
      '--no-abort-on-error',
      '--concurrent-fragments', '6', // Increased from 3
      '--buffer-size', '16K',
      '--http-chunk-size', '4M',
      '--extractor-retries', '10',
      '--retry-sleep', '1'
    ]
  };

  // Download quality settings - for high quality video
  const qualitySettings = {
    // High quality - 1080p and above
    'high': 'bestvideo[height>=1080]+bestaudio/best[height>=1080]',
    // Medium quality - 720p
    'medium': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    // Low quality - 480p and below
    'low': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    // Best available quality
    'best': 'bestvideo+bestaudio/best',
    // Audio only (fastest)
    'audio': 'bestaudio/best'
  };

  // Speed optimization settings
  const speedSettings = {
    'fast': ['--downloader', 'curl', '--downloader-args', 'curl:-L -C - -o'],
    'medium': [],
    'slow': ['--buffer-size', '32K'],
    'very-slow': ['--buffer-size', '64K', '--no-check-certificate']
  };

  return new Promise((resolve) => {
    const { url, format, outputPath, networkQuality } = options;
    const downloadQuality = options.downloadQuality || options.quality || 'best';

    const args = [
      ...networkSettings[networkQuality || 'medium'],
      '--newline',
      '--no-playlist',
      '-o', path.join(outputPath, '%(title)s.%(ext)s'),
      // Simplified speed optimization - only valid options
      '--concurrent-fragments', '16', // Force high concurrency
      '--buffer-size', '64K', // Good buffer size
      '--no-cache-dir', // Skip cache for faster start
      '--no-warnings', // Reduce overhead
      '--progress', // Show progress
      '--no-abort-on-error', // Don't abort on minor errors
      '--retries', '5', // Reasonable retry count
      '--fragment-retries', '5' // Retry failed fragments
    ];

    // Add format selection based on quality setting
    const selectedQuality = downloadQuality || quality || 'best';
    
    if (format && format.format_id) {
      // Check if this format already includes audio (has acodec !== 'none')
      // or if it's a combined format (format_note contains 'audio' or similar)
      if (format.acodec && format.acodec !== 'none') {
        // Format already has audio, use it directly
        args.push('-f', format.format_id);
      } else {
        // Video-only format, merge with best audio
        args.push('-f', `${format.format_id}+bestaudio`);
      }
    } else {
      // Use quality-based format selection
      args.push('-f', qualitySettings[selectedQuality] || qualitySettings['best']);
    }

    args.push(url);

    console.log('yt-dlp args:', args);
    console.log(`Starting download ${downloadId} for:`, options.url);
    let errorData = '';

    const downloadProcess = spawn('yt-dlp', args);
    // Store the process with the URL for duplicate checking and byte tracking
    activeDownloads.set(downloadId, { 
      process: downloadProcess, 
      url: options.url,
      title: displayTitle,
      downloadedBytes: 0 // Track downloaded bytes for speed monitoring
    });

    // Start speed monitoring for this download
    startSpeedMonitoring(downloadId);

    console.log(`Download ${downloadId} started with PID: ${downloadProcess.pid}`);

    // Send initial download info to frontend
    mainWindow.webContents.send('download-progress', {
      downloadId,
      title: displayTitle,
      progress: 0,
      speed: '0',
      eta: 'Calculating...'
    });

    downloadProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Parse progress from yt-dlp output
      const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
      const sizeMatch = output.match(/(\d+\.?\d*)([KMGT]?iB)\/(\d+\.?\d*)([KMGT]?iB)/);
      const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
      const speedMatch = output.match(/(\d+\.?\d*)([KMGT]?iB)\/s/);
      
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        
        // Update downloaded bytes for speed monitoring
        if (sizeMatch) {
          const downloaded = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2];
          let bytes = downloaded;
          if (unit === 'KiB') bytes = downloaded * 1024;
          else if (unit === 'MiB') bytes = downloaded * 1024 * 1024;
          else if (unit === 'GiB') bytes = downloaded * 1024 * 1024 * 1024;
          else if (unit === 'TiB') bytes = downloaded * 1024 * 1024 * 1024 * 1024;
          
          const downloadData = activeDownloads.get(downloadId);
          if (downloadData) {
            downloadData.downloadedBytes = bytes;
          }
        }
        
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress,
          speed: speedMatch ? `${speedMatch[1]}${speedMatch[2]}/s` : (sizeMatch ? `${sizeMatch[1]}${sizeMatch[2]}` : 'Unknown'),
          eta: etaMatch ? etaMatch[1] : 'Calculating...'
        });
      }
    });

    downloadProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      errorData += errorOutput;
      console.error('yt-dlp stderr:', errorOutput);
      
      mainWindow.webContents.send('download-progress', {
        downloadId,
        error: errorOutput,
        progress: 0
      });
    });

    downloadProcess.on('close', (code) => {
      // Stop speed monitoring for this download
      stopSpeedMonitoring(downloadId);
      
      activeDownloads.delete(downloadId);
      
      if (code === 0) {
        // Try to find the downloaded file
        let downloadedFilePath = null;
        try {
          const outputDir = options.outputPath;
          const files = fs.readdirSync(outputDir);
          
          // Find the most recently modified file that matches the video title
          const searchTitle = options.videoInfo?.title || `download_${downloadId}`;
          const matchingFiles = files.filter(file => 
            file.toLowerCase().includes(searchTitle.toLowerCase().replace(/[^\w\s]/gi, '').substring(0, 20))
          );
          
          if (matchingFiles.length > 0) {
            const sortedFiles = matchingFiles.map(file => ({
              name: file,
              path: path.join(outputDir, file),
              mtime: fs.statSync(path.join(outputDir, file)).mtime
            })).sort((a, b) => b.mtime - a.mtime);
            
            downloadedFilePath = sortedFiles[0].path;
          }
        } catch (error) {
          console.error('Error finding downloaded file:', error);
        }
        
        // Save to download history to prevent duplicates
        if (downloadedFilePath && options.url) {
          downloadedVideos.set(options.url, {
            filePath: downloadedFilePath,
            title: options.videoInfo?.title || displayTitle,
            downloadDate: new Date().toISOString()
          });
          // Persist to disk
          saveDownloadHistory();
        }
        
        mainWindow.webContents.send('download-progress', {
          downloadId,
          progress: 100,
          completed: true,
          filePath: downloadedFilePath
        });
        resolve({ success: true, downloadId, filePath: downloadedFilePath });
      } else {
        console.error('yt-dlp failed with code:', code);
        console.error('Error data:', errorData);
        mainWindow.webContents.send('download-progress', {
          downloadId,
          error: errorData || `Download failed with code ${code}`,
          failed: true
        });
        resolve({ 
          success: false, 
          error: errorData || `Download failed with code ${code}`,
          downloadId 
        });
      }
    });

    downloadProcess.on('error', (error) => {
      // Stop speed monitoring for this download
      stopSpeedMonitoring(downloadId);
      
      activeDownloads.delete(downloadId);
      mainWindow.webContents.send('download-progress', {
        downloadId,
        error: error.message,
        failed: true
      });
      resolve({ success: false, error: error.message, downloadId });
    });
  });
});

ipcMain.handle('cancel-download', async (event, downloadId) => {
  if (downloadId && activeDownloads.has(downloadId)) {
    const downloadData = activeDownloads.get(downloadId);
    const downloadProcess = downloadData.process;
    
    // Stop speed monitoring first
    stopSpeedMonitoring(downloadId);
    
    try {
      // Try graceful termination first
      downloadProcess.kill('SIGTERM');
      
      // Store the process reference for force kill
      const processRef = downloadProcess;
      
      // Force kill after 2 seconds if still running
      setTimeout(() => {
        try {
          // Check if process is still running by checking if it has a PID
          if (processRef.pid) {
            processRef.kill('SIGKILL');
          }
        } catch (e) {
          // Process already dead, ignore
        }
      }, 2000);
      
      // Remove from active downloads
      activeDownloads.delete(downloadId);
      
      // Notify frontend
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          downloadId,
          cancelled: true,
          message: 'Download cancelled by user'
        });
      }
      
      return { success: true, downloadId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, error: 'Download not found' };
});

// Pause a download (POSIX: send SIGSTOP)
ipcMain.handle('pause-download', async (event, downloadId) => {
  if (!downloadId || !activeDownloads.has(downloadId)) {
    return { success: false, error: 'Download not found' };
  }

  const downloadData = activeDownloads.get(downloadId);
  try {
    const proc = downloadData.process;
    if (!proc || proc.killed) return { success: false, error: 'Process not running' };

    if (process.platform === 'win32') {
      return { success: false, error: 'Pause not supported on Windows (SIGSTOP unavailable)' };
    }

    process.kill(proc.pid, 'SIGSTOP');
    downloadData.paused = true;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', { downloadId, paused: true, message: 'Download paused' });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Resume a paused download (POSIX: send SIGCONT)
ipcMain.handle('resume-download', async (event, downloadId) => {
  if (!downloadId || !activeDownloads.has(downloadId)) {
    return { success: false, error: 'Download not found' };
  }

  const downloadData = activeDownloads.get(downloadId);
  try {
    const proc = downloadData.process;
    if (!proc || proc.killed) return { success: false, error: 'Process not running' };

    if (process.platform === 'win32') {
      return { success: false, error: 'Resume not supported on Windows (SIGCONT unavailable)' };
    }

    process.kill(proc.pid, 'SIGCONT');
    downloadData.paused = false;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', { downloadId, paused: false, message: 'Download resumed' });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cancel-all-downloads', async () => {
  let canceledCount = 0;
  
  // Stop all speed monitors
  for (const downloadId of downloadMonitors.keys()) {
    stopSpeedMonitoring(downloadId);
  }
  
  // Kill all download processes
  for (const [downloadId, downloadData] of activeDownloads) {
    downloadData.process.kill();
    canceledCount++;
  }
  
  activeDownloads.clear();
  return { success: true, canceledCount };
});
ipcMain.handle('open-file-location', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Invalid file path provided' };
  }
  
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    
    // Open the containing folder and select the file
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open download folder in file explorer
ipcMain.handle('open-download-folder', async (event, folderPath) => {
  if (!folderPath || typeof folderPath !== 'string') {
    return { success: false, error: 'Invalid folder path provided' };
  }
  
  try {
    // Check if the folder exists
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder not found' };
    }
    
    // Open the folder in file explorer
    shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get active downloads count
ipcMain.handle('get-active-downloads', async () => {
  return {
    success: true,
    count: activeDownloads.size,
    downloadIds: Array.from(activeDownloads.keys())
  };
});

// Check if yt-dlp is installed
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
      
      // Timeout after 5 seconds
      setTimeout(() => {
        checkProcess.kill();
        resolve({ success: false });
      }, 5000);
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
});

// Check if video was already downloaded
ipcMain.handle('check-download-history', async (event, url) => {
  if (!url || typeof url !== 'string') {
    return { exists: false };
  }
  
  const downloadInfo = downloadedVideos.get(url);
  if (downloadInfo) {
    // Check if file still exists
    if (fs.existsSync(downloadInfo.filePath)) {
      return { 
        exists: true, 
        filePath: downloadInfo.filePath,
        title: downloadInfo.title,
        downloadDate: downloadInfo.downloadDate
      };
    } else {
      // File was deleted, remove from history
      downloadedVideos.delete(url);
      return { exists: false };
    }
  }
  
  return { exists: false };
});

// Get all download history
ipcMain.handle('get-download-history', async () => {
  const history = [];
  for (const [url, info] of downloadedVideos) {
    // Check if file still exists
    if (fs.existsSync(info.filePath)) {
      history.push({
        url,
        ...info
      });
    } else {
      // Clean up entries for deleted files
      downloadedVideos.delete(url);
    }
  }
  return { success: true, history };
});

// Clear download history
ipcMain.handle('clear-download-history', async () => {
  downloadedVideos.clear();
  return { success: true };
});