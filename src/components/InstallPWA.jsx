import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 2. Check for Android "Add to Home Screen" event
    const handler = (e) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);

    // 3. If on iOS and not in standalone mode (not installed yet)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    if (isIosDevice && !isInStandaloneMode) {
      setSupportsPWA(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e) => {
    e.preventDefault();
    if (isIOS) {
      // iOS doesn't allow programmatic install, show instructions
      setShowInstructions(true);
    } else if (promptInstall) {
      // Android allows programmatic install
      promptInstall.prompt();
    }
  };

  // If already installed or not mobile, hide button
  if (!supportsPWA) return null;

  return (
    <>
      {/* FLOATING INSTALL BUTTON */}
      <div className="fixed bottom-24 right-4 z-40 animate-bounce-slow">
        <button
          onClick={handleInstallClick}
          className="bg-[#013E37] text-white p-3 rounded-full shadow-xl flex items-center gap-2 pr-5 border-2 border-[#F4F3F2]"
        >
          <div className="bg-white/20 p-1.5 rounded-full">
            <Download size={18} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-medium opacity-80 leading-none">Get the</p>
            <p className="text-xs font-bold leading-tight">Morpho App</p>
          </div>
        </button>
      </div>

      {/* IOS INSTRUCTIONS MODAL */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center pb-8 animate-fade-in p-4" onClick={() => setShowInstructions(false)}>
          <div className="bg-[#F4F3F2] w-full max-w-sm p-6 rounded-3xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 bg-gray-200 p-1 rounded-full text-gray-500"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-black text-[#013E37] mb-2">Install Morpho App</h3>
            <p className="text-gray-600 text-sm mb-6">Install our app for a better experience and real-time order tracking!</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200">
                <Share size={24} className="text-blue-500" />
                <p className="text-sm font-bold text-gray-700">1. Tap the <span className="text-blue-500">Share</span> button</p>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200">
                <PlusSquare size={24} className="text-gray-500" />
                <p className="text-sm font-bold text-gray-700">2. Select <span className="text-gray-900">Add to Home Screen</span></p>
              </div>
            </div>
            
            <div className="mt-6 text-center text-xs text-gray-400">
              Tap anywhere to close
            </div>
          </div>
          
          {/* Arrow pointing to bottom center (where Safari share button usually is) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white animate-bounce">
            ▼
          </div>
        </div>
      )}
    </>
  );
};