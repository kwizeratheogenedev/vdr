import React from 'react';

function AnimatedProgressBar({ progress, isCompleted, isFailed }) {
  return (
    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          isCompleted 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : isFailed 
              ? 'bg-red-500' 
              : 'bg-gradient-to-r from-blue-600 to-blue-800'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default AnimatedProgressBar;
