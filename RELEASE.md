# VDR Video Downloader - Release Guide

This guide explains how to build and release the application for Windows, macOS, and Linux.

## Prerequisites

- Node.js 16+ installed
- npm or yarn
- Git with GitHub access

### Platform-Specific Requirements

**Windows**:
- Windows build can be done on any platform (cross-compilation supported)
- For signing: Windows Code Signing Certificate (optional)

**macOS**:
- Must build on macOS to create `.dmg` and `.app`
- For notarization: Apple Developer Account (optional)

**Linux**:
- AppImage can be built on any Linux distribution
- Single binary for all Linux systems

## Building Process

### 1. Build for Linux (from Linux or CI)

```bash
npm run electron-pack -- --linux
```

Outputs:
- `dist/VDR Video Downloader-*.AppImage` (executable)
- `dist/VDR Video Downloader-*.deb` (Debian installer)

### 2. Build for Windows (from any platform)

```bash
npm run electron-pack -- --win
```

Outputs:
- `dist/VDR Video Downloader-*.exe` (NSIS installer)
- `dist/VDR Video Downloader-*.portable.exe` (portable version)

### 3. Build for macOS (from macOS only)

```bash
npm run electron-pack -- --mac
```

Outputs:
- `dist/VDR Video Downloader-*.dmg` (DMG installer)
- `dist/VDR Video Downloader-*.zip` (ZIP archive)

## Automated Building with GitHub Actions

The easiest way to build for all platforms is using GitHub Actions:

### 1. Tag a release:
```bash
git tag v1.1.0
git push origin v1.1.0
```

### 2. GitHub Actions will:
- Build on Linux, Windows, and macOS runners
- Automatically create a GitHub Release
- Upload all installers to the release

### 3. Access your release:
- Go to: https://github.com/kwizeratheogenedev/vdr/releases
- Download installers for your OS

## Manual Release Upload

If building locally:

### 1. Build on each platform:
```bash
# On Linux
npm run electron-pack -- --linux

# On Windows
npm run electron-pack -- --win

# On macOS
npm run electron-pack -- --mac
```

### 2. Create a release on GitHub:
- Go to: https://github.com/kwizeratheogenedev/vdr/releases
- Click "Draft a new release"
- Enter tag: `v1.1.0`
- Title: `Version 1.1.0`
- Upload files from `dist/`

### 3. Supported files to upload:
- Linux: `.AppImage`, `.deb`
- Windows: `.exe`, `.portable.exe`
- macOS: `.dmg`, `.zip`

## Files Included in Release

Each platform release should include:

**Linux**:
```
dist/VDR Video Downloader-1.1.0.AppImage
dist/VDR Video Downloader-1.1.0.deb
dist/latest-linux.yml
```

**Windows**:
```
dist/VDR Video Downloader-1.1.0.exe
dist/VDR Video Downloader-1.1.0-portable.exe
dist/latest.yml
```

**macOS**:
```
dist/VDR Video Downloader-1.1.0.dmg
dist/VDR Video Downloader-1.1.0.zip
dist/latest-mac.yml
```

## Installation Instructions for Users

### Windows
1. Download `VDR Video Downloader-*.exe`
2. Run installer
3. Accept installation location
4. App appears in Start Menu

### macOS
1. Download `VDR Video Downloader-*.dmg`
2. Open DMG file
3. Drag app to Applications folder
4. Launch from Applications or Spotlight

### Linux
1. Download `VDR Video Downloader-*.AppImage`
2. Make executable: `chmod +x VDR*.AppImage`
3. Run directly or add to applications menu
4. Alternative: `sudo apt install VDR*.deb` (Debian/Ubuntu)

## Versioning

Follow semantic versioning:
- `v1.0.0` - Major version (breaking changes)
- `v1.1.0` - Minor version (new features)
- `v1.0.1` - Patch version (bug fixes)

## Auto-Updates (Optional)

The `electron-builder` config includes GitHub publish settings. To enable auto-updates:

1. In your Electron main process, add:
```javascript
const {autoUpdater} = require('electron-updater');

if (app.isPackaged) {
  autoUpdater.checkForUpdatesAndNotify();
}
```

2. Users will get notified when updates are available

## Troubleshooting

**"yt-dlp not found" after install**:
- User needs to install yt-dlp separately
- Windows: `pip install yt-dlp`
- macOS: `brew install yt-dlp`
- Linux: `sudo apt install yt-dlp`

**Build fails with permission error**:
- Ensure `entitlements.mac.plist` exists (for macOS)
- Clear `dist/` folder: `rm -rf dist`

**Code signing issues**:
- For development: skip signing (default)
- For production: obtain Apple Developer Certificate
- Update `certificateFile` in `package.json`

## CI/CD Status

GitHub Actions workflow: `.github/workflows/build-release.yml`

Check status at: https://github.com/kwizeratheogenedev/vdr/actions
