import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, MoreVertical, Menu } from 'lucide-react';

export const AndroidInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;
    if (isStandalone) return;

    // 2. Detect Firefox
    const userAgent = navigator.userAgent.toLowerCase();
    const isFx = userAgent.includes('firefox');
    setIsFirefox(isFx);

    // 3. Check for "Magic Flag" from Messenger
    const urlParams = new URLSearchParams(window.location.search);
    const shouldTriggerImmediately =
      urlParams.get('trigger_install') === 'true';

    // --- STRATEGY FOR CHROME / SAMSUNG / EDGE ---
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (shouldTriggerImmediately) {
        setIsVisible(true);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setTimeout(() => setIsVisible(true), 3000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // --- STRATEGY FOR FIREFOX (Manual Trigger) ---
    // Since Firefox doesn't fire the event, we manually show the popup
    // if the "magic flag" is present OR after a delay.
    if (isFx) {
      if (shouldTriggerImmediately) {
        setIsVisible(true);
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        // Show it eventually for organic Firefox visitors too
        setTimeout(() => setIsVisible(true), 3000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-poppins">
      <div className="bg-[#F4F3F2] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 bg-black/10 hover:bg-black/20 text-white p-2 rounded-full z-10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="bg-[#013E37] p-6 text-center pt-10 pb-12 rounded-b-[50%] -mx-4 -mt-4 mb-4 relative">
          <div className="bg-white/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/20 shadow-lg mb-4">
            <Smartphone size={40} className="text-white" />
          </div>
          <h2 className="text-white text-2xl font-black leading-tight px-4 tracking-tight">
            Get the App
          </h2>
          <p className="text-[#F4F3F2]/80 text-sm mt-1">
            {isFirefox
              ? 'Follow instructions below'
              : 'Faster ordering, no download needed.'}
          </p>
        </div>

        <div className="px-6 pb-8">
          {/* CONTENT VARIES BASED ON BROWSER */}
          {isFirefox ? (
            // --- FIREFOX MANUAL INSTRUCTIONS ---
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                <p className="text-orange-800 text-xs font-bold mb-2">
                  FIREFOX DETECTED
                </p>
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-white p-1.5 rounded-lg border border-orange-100 shadow-sm text-gray-600">
                    <MoreVertical size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">
                      1. Tap the Menu
                    </p>
                    <p className="text-xs text-gray-500">
                      Usually 3 dots (⋮) at bottom/top.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-lg border border-orange-100 shadow-sm text-gray-600">
                    <Download size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">
                      2. Select "Install"
                    </p>
                    <p className="text-xs text-gray-500">
                      Or "Add to Home Screen".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // --- CHROME / SAMSUNG / EDGE AUTOMATIC BUTTON ---
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="bg-green-100 p-2.5 rounded-full text-green-700">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    Instant Access
                  </h4>
                  <p className="text-xs text-gray-500">
                    Launch from your home screen.
                  </p>
                </div>
              </div>

              <button
                onClick={handleInstallClick}
                className="w-full bg-[#013E37] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Install Now
              </button>
            </div>
          )}

          <button
            onClick={() => setIsVisible(false)}
            className="w-full mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
