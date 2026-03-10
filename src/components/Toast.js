import React, { useEffect } from 'react';
import Icons from './Icons';

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getBgColor = () => {
    switch (message.type) {
      case 'error': return 'bg-red-500/90 border-red-400/50';
      case 'success': return 'bg-green-500/90 border-green-400/50';
      case 'info': return 'bg-blue-500/90 border-blue-400/50';
      default: return 'bg-purple-500/90 border-purple-400/50';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'error': return <Icons.Close />;
      case 'success': return <Icons.Check />;
      case 'info': return <Icons.Info />;
      default: return <Icons.Sparkles />;
    }
  };

  return (
    <div className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-2xl animate-slide-in ${getBgColor()}`}>
      <div className="flex items-center gap-3">
        <span className="text-white">{getIcon()}</span>
        <span className="text-white font-medium text-sm">{message.text}</span>
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
          <Icons.Close />
        </button>
      </div>
    </div>
  );
}

export default Toast;
