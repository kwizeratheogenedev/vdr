import React from 'react';

const NonElectronWarning = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
    <div className="bg-black/50 backdrop-blur-xl rounded-3xl p-10 max-w-lg w-full text-center border border-white/10 shadow-2xl">
      <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-white text-3xl font-bold mb-4">Running Outside Electron</h1>
      <p className="text-gray-300 mb-2">
        This application is designed to run in <span className="text-blue-400 font-semibold">Electron</span>, not in a regular web browser.
      </p>
      <p className="text-gray-400 mb-8">To use this app, please run it using Electron:</p>
      <div className="bg-black/40 rounded-xl p-4 text-left mb-8 border border-white/10">
        <code className="text-green-400 font-mono text-sm">npm run electron-dev</code>
      </div>
      <p className="text-gray-500 text-sm">
        Or build and run: <code className="text-gray-400">npm run electron-pack</code>
      </p>
    </div>
  </div>
);

export default NonElectronWarning;
