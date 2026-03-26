import React from 'react';
import Icons from './Icons';

function DownloadCard({ download, onSelect, onOpenFile, onDelete }) {
  const isCompleted = download.completed;
  const isFailed = download.failed;
  const isDownloading = download.progress !== undefined && !isCompleted && !isFailed;
  const progress = download.progress || 0;

  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-500';
    if (isFailed) return 'bg-red-500';
    if (download.paused) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const copyToClipboard = async (text, successMessage) => {
    if (window.electronAPI?.copyToClipboard) {
      const result = await window.electronAPI.copyToClipboard(text);
      if (result.success) {
        // Could show a toast here, but for now we'll just rely on the parent component's showMessage
        console.log(successMessage);
      } else {
        console.error('Failed to copy to clipboard');
      }
    }
  };

  return (
    <div 
      className="group relative bg-black/40 backdrop-blur-sm rounded-xl border border-white/5 hover:bg-black/50 hover:border-white/10 transition-all duration-200 cursor-pointer"
      onClick={() => onSelect && onSelect(download)}
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isDownloading ? 'animate-pulse' : ''}`} />
          
          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white text-sm truncate flex-1">
                {download.title || (isCompleted ? 'Download Complete' : isFailed ? 'Download Failed' : isDownloading ? 'Downloading...' : 'Unknown')}
              </h4>
              {download.title && (
                <button 
                  className="opacity-0 group-hover:opacity-100 p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-all duration-200"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    copyToClipboard(download.title, 'Title copied to clipboard'); 
                  }}
                  title="Copy title"
                >
                  <Icons.Copy />
                </button>
              )}
            </div>
          </div>
          
          {/* Progress, Speed, ETA */}
          <div className="flex items-center gap-2 text-xs text-white/50">
            {isDownloading && (
              <>
                <span>{progress.toFixed(0)}%</span>
                {download.speed && <span className="text-blue-400">{download.speed}</span>}
                {download.eta && <span className="text-yellow-400">{download.eta}</span>}
              </>
            )}
            {isCompleted && download.totalSize && <span>{download.totalSize}</span>}
            {isFailed && <span className="text-red-400">Failed</span>}
            {download.paused && <span className="text-yellow-400">Paused</span>}
          </div>
          
          {/* Actions - appear on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {download.url && (
              <button 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  copyToClipboard(download.url, 'URL copied to clipboard'); 
                }}
                title="Copy URL"
              >
                <Icons.Copy />
              </button>
            )}
            {isCompleted && download.filePath && (
              <>
                <button 
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                  onClick={(e) => { e.stopPropagation(); onOpenFile(download.filePath); }}
                  title="Open folder"
                >
                  <Icons.Folder className="w-4 h-4" />
                </button>
                <button 
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    copyToClipboard(download.filePath, 'File path copied to clipboard'); 
                  }}
                  title="Copy file path"
                >
                  <Icons.Copy />
                </button>
              </>
            )}
            <button 
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              onClick={(e) => { e.stopPropagation(); onDelete(download.id); }}
              title="Delete"
            >
              <Icons.Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isDownloading && (
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default DownloadCard;
