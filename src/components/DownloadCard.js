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
            <h4 className="text-white text-sm truncate">
              {download.title || (isCompleted ? 'Download Complete' : isFailed ? 'Download Failed' : isDownloading ? 'Downloading...' : 'Unknown')}
            </h4>
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
            {isCompleted && download.filePath && (
              <button 
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                onClick={(e) => { e.stopPropagation(); onOpenFile(download.filePath); }}
                title="Open folder"
              >
                <Icons.Folder className="w-4 h-4" />
              </button>
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
