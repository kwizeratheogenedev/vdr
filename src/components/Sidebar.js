import React from 'react';
import Icons from './Icons';

function Sidebar({ activeTab, setActiveTab, activeDownloadsCount }) {
  const tabs = [
    { id: 'downloads', icon: Icons.Download, label: 'Downloads', gradient: 'from-blue-600 to-blue-800' },
    { id: 'history', icon: Icons.History, label: 'History', gradient: 'from-green-600 to-green-800' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings', gradient: 'from-slate-600 to-slate-800' },
  ];

  return (
    <div className="w-16 bg-gradient-to-b from-slate-950/90 to-black/90 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`relative w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 group ${
            activeTab === tab.id 
              ? `bg-gradient-to-br ${tab.gradient} border border-blue-500/30` 
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
          title={tab.label}
        >
          <tab.icon />
          {tab.id === 'downloads' && activeDownloadsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {activeDownloadsCount}
            </span>
          )}
          <span className={`text-[9px] mt-0.5 font-medium ${activeTab === tab.id ? 'text-white' : 'text-white/50'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default Sidebar;
