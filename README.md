# VDR Video Downloader

A modern video downloader built with React, TailwindCSS, Electron, and Node.js. Download videos from YouTube, Facebook, TikTok, Instagram, and 1000+ other platforms.

## Features

- 🎥 **Multi-platform Support**: Download from YouTube, Facebook, TikTok, Instagram, Twitter/X, Vimeo, Twitch, and more
- 🎨 **Modern UI**: Beautiful interface built with React and TailwindCSS
- 📁 **Custom Download Location**: Choose where to save your downloaded videos
- 🎯 **Format Selection**: Download in various video formats and qualities
- 📊 **Real-time Progress**: Track download progress with live updates
- 🖼️ **Video Preview**: See video thumbnails and information before downloading
- 💻 **Cross-platform**: Works on Windows, macOS, and Linux
- 🌐 **Network Quality Options**: Optimize downloads based on your connection speed

## Prerequisites

Before running the application, you need to install `yt-dlp` on your system:

### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install python3-pip
pip3 install yt-dlp
```

### macOS:
```bash
brew install yt-dlp
```

### Windows:
```bash
pip install yt-dlp
```

Or download from: https://github.com/yt-dlp/yt-dlp/releases

## Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode:
```bash
npm run electron-dev
```

This will start both the React development server and Electron.

### Production Mode:
First build the React app:
```bash
npm run build
```

Then run Electron:
```bash
npm run electron
```

## Building the Application

To create a distributable version:

```bash
npm run electron-pack
```

The built application will be available in the `dist` folder.

## How to Use

1. **Paste Video URL**: Enter the URL of the video you want to download
2. **Get Info**: Click "Get Info" to fetch video details and available formats
3. **Select Format**: Choose your preferred video quality and format
4. **Choose Download Folder**: Select where you want to save the file
5. **Download**: Click "Download Video" to start downloading

## Network Quality Settings

- **Fast**: High quality, fewer retries (good for stable connections)
- **Medium**: Balanced quality and reliability (default)
- **Slow**: More retries, longer timeout (for unstable connections)
- **Very Slow**: Maximum reliability with extensive retry logic

## Supported Sites

This application supports over 1000 websites including:
- YouTube
- Facebook
- TikTok
- Instagram
- Twitter/X
- Vimeo
- Dailymotion
- Twitch
- And many more...

## Technology Stack

- **Frontend**: React 18, TailwindCSS
- **Backend**: Node.js, Electron
- **Video Processing**: yt-dlp
- **Build Tools**: Create React App, Electron Builder

## Troubleshooting

### "yt-dlp not found" Error
Make sure `yt-dlp` is installed and available in your system's PATH.

### Impersonation Errors
If you see an error such as:

```
Impersonate target "chrome" is not available. Use --list-impersonate-targets to see available targets.
```

it means the optional Python dependency `curl_cffi` (used by yt‑dlp for browser header emulation) isn't installed. Either install it with:

```sh
pip install curl_cffi          # or pip install yt-dlp[all]
```

or the application will automatically skip the impersonation flags and continue without them.

### Download Fails
- Check your internet connection
- Verify the video URL is correct
- Some videos may be private or region-restricted
- Try adjusting the network quality setting

### Format Selection Issues
Not all videos are available in all formats. The application will show only the formats available for the specific video.

### Universal / "Download everything" Mode
The quick download box can now handle **any URL** – images, videos, documents, generic web pages, etc. Under the hood the app invokes yt‑dlp in a generic mode and will attempt to fetch any media it understands. For simple image/video links the content is downloaded directly; for other pages it will try to scrape and download all media items it can find (including thumbnails and metadata when the "download everything" option is enabled).

You can still fall back to the manual "direct download" button if you only need to grab a single file.

## Security Note

This application is for personal use only. Please respect copyright laws and the terms of service of the platforms you're downloading from.

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
