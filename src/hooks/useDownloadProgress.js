import { useEffect } from 'react';

export function useDownloadProgress({ setActiveDownloads, setCompletedDownloads }) {
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onDownloadProgress) return;

    const unsubscribe = window.electronAPI.onDownloadProgress((data) => {
      setActiveDownloads(prev => {
        const newDownloads = new Map(prev);
        
        if (data.completed || data.failed) {
          const download = newDownloads.get(data.downloadId);
          if (download) {
            newDownloads.set(data.downloadId, {
              ...download,
              completed: data.completed,
              failed: data.failed,
              progress: 100,
              filePath: data.filePath,
              error: data.error
            });
            
            if (data.completed) {
              // Capture current download state to avoid stale closure
              const completedDownload = {
                ...download,
                completed: true,
                progress: 100,
                filePath: data.filePath
              };
              setTimeout(() => {
                setCompletedDownloads(prev => {
                  const completed = new Map(prev);
                  completed.set(data.downloadId, completedDownload);
                  return completed;
                });
                newDownloads.delete(data.downloadId);
              }, 2000);
            }
          }
        } else if (data.downloadId) {
          const existing = newDownloads.get(data.downloadId);
          if (existing) {
            newDownloads.set(data.downloadId, {
              ...existing,
              progress: data.progress || existing.progress,
              speed: data.speed || existing.speed,
              eta: data.eta || existing.eta,
              downloadedSize: data.downloadedSize,
              totalSize: data.totalSize,
              paused: data.paused
            });
          }
        }
        
        return newDownloads;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setActiveDownloads, setCompletedDownloads]);

  return { updateDownloadProgress: () => {} };
}
