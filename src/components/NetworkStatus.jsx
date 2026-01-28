import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-fade-in">
      <div className="bg-red-100 p-6 rounded-full mb-6 animate-pulse">
        <WifiOff size={48} className="text-red-600" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">No Connection</h2>
      <p className="text-gray-500 max-w-xs">
        Morpho requires an internet connection to load the latest menu prices.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-8 px-8 py-3 bg-[#013E37] text-white rounded-xl font-bold"
      >
        Try Again
      </button>
    </div>
  );
};