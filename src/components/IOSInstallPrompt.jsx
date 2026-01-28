import React, { useState, useEffect } from 'react';
import {
  Share,
  PlusSquare,
  Copy,
  Compass,
  X,
  CheckCircle,
  Download,
} from 'lucide-react';

export const IOSInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSafari, setIsSafari] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;

    // --- 1. ROBUST IOS DETECTION (Fixes iPad Issue) ---
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // Detects iPads masquerading as Macs

    // Check if already installed (Standalone mode)
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      // Simple heuristic: If it says 'Safari' but also 'CriOS' or 'FxiOS', it's NOT real Safari
      const isNonSafari = /crios|fxios|edgios|opt/i.test(ua);

      // --- PRODUCTION MODE RESTORED ---
      setIsSafari(!isNonSafari);

      // Delay slightly to be polite
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSafari = () => {
    // Visual guide mostly
    window.location.href = window.location.href;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-poppins">
      <div className="bg-[#F4F3F2] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative animate-scaleIn">
        {/* Header Image / Icon Area */}
        <div className="bg-[#013E37] p-6 text-center pt-8 pb-12 rounded-b-[50%] -mx-4 -mt-4 mb-4">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/20 shadow-lg mb-3">
            <Download size={32} className="text-white" />
          </div>
          <h2 className="text-white text-xl font-bold leading-tight px-4">
            Install Morpho App
            <br />
            <span className="text-[#F4F3F2]/70 text-sm font-normal">
              for Faster Ordering
            </span>
          </h2>
        </div>

        {/* Content Body */}
        <div className="px-6 pb-6">
          {/* Dynamic Steps based on Browser */}
          <div className="space-y-4">
            {/* Step 1: Copy Link (Only if NOT Safari) */}
            {!isSafari && (
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                <button
                  onClick={handleCopyLink}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 1
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    Copy App Link
                  </p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="text-xs font-bold text-[#013E37] bg-[#013E37]/10 px-3 py-1.5 rounded-lg"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            {/* Step 2: Open Safari (Only if NOT Safari) */}
            {!isSafari && (
              <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-10 h-10 bg-green-100 text-[#013E37] rounded-full flex items-center justify-center shrink-0">
                  <Compass size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step 2
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    Open <span className="text-[#013E37]">Safari</span> & Paste
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Share (Always needed for install) */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-green-100 text-[#013E37] rounded-full flex items-center justify-center shrink-0">
                <Share size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isSafari ? 'Step 1' : 'Step 3'}
                </p>
                <p className="text-sm font-bold text-gray-800">
                  Tap <span className="text-[#013E37]">Share</span> in toolbar
                </p>
              </div>
            </div>

            {/* Step 4: Add to Home (Always needed) */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-green-100 text-[#013E37] rounded-full flex items-center justify-center shrink-0">
                <PlusSquare size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isSafari ? 'Step 2' : 'Step 4'}
                </p>
                <p className="text-sm font-bold text-gray-800">
                  Tap <span className="text-gray-900">Add to Home Screen</span>
                </p>
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="w-full mt-6 py-4 text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Continue in Browser
          </button>
        </div>
      </div>
    </div>
  );
};
