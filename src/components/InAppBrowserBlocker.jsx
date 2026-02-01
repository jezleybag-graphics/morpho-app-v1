import React, { useState, useEffect } from 'react';
import { Download, Copy, CheckCircle, ExternalLink, Compass, MoreHorizontal, Share } from 'lucide-react';

export const InAppBrowserBlocker = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [platform, setPlatform] = useState('unknown'); // 'ios' or 'android'
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const uaStr = ua.toLowerCase();

    // 1. Detect Platform
    const isIos = /iphone|ipad|ipod/.test(uaStr);
    const isAndroid = /android/.test(uaStr);

    setPlatform(isIos ? 'ios' : isAndroid ? 'android' : 'desktop');

    // 2. Detect "Bad" Browsers
    // Social In-App Browsers (FB, Messenger, Insta, TikTok, Line)
    const isInApp = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || 
                    (ua.indexOf("Instagram") > -1) || (ua.indexOf("Messenger") > -1) ||
                    (ua.indexOf("Line") > -1) || (ua.indexOf("TikTok") > -1);

    // Non-Safari Browsers on iOS (Chrome, Firefox, Brave*)
    // *Brave is hard to detect reliably on iOS, but often looks like Chrome (CriOS)
    const isNonSafariIos = isIos && (ua.indexOf("CriOS") > -1 || ua.indexOf("FxiOS") > -1);

    // 3. Trigger Block
    if (isAndroid && isInApp) {
      setIsBlocked(true);
    } else if (isIos && (isInApp || isNonSafariIos)) {
      setIsBlocked(true);
    }

  }, []);

  const openAndroidIntent = () => {
    const targetUrl = window.location.href;
    const cleanDomainPath = targetUrl.replace(/^https?:\/\//, '');
    const intentUrl = `intent://${cleanDomainPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
    window.location.href = intentUrl;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#013E37]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in font-poppins text-[#F4F3F2]">
      
      {/* --- HEADER ICON --- */}
      <div className="bg-white/10 p-5 rounded-full mb-6 animate-bounce-slow shadow-2xl ring-4 ring-white/5">
        {platform === 'ios' ? <Compass size={48} /> : <ExternalLink size={48} />}
      </div>

      <h1 className="text-2xl font-black mb-3 leading-tight">
        {platform === 'ios' ? 'Open in Safari' : 'Open in Chrome'}
      </h1>
      
      <p className="text-white/70 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
        {platform === 'ios' 
          ? "To add this app to your Home Screen, please open it in the Safari browser."
          : "For the best experience, please open this in your main browser."
        }
      </p>

      {/* --- ACTION CARD --- */}
      <div className="bg-[#F4F3F2] w-full max-w-sm rounded-3xl p-6 text-gray-900 shadow-2xl relative overflow-hidden">
        
        {/* ANDROID: Automatic Button */}
        {platform === 'android' && (
          <button 
             onClick={openAndroidIntent}
             className="w-full bg-[#013E37] text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform mb-4 flex items-center justify-center gap-2"
           >
             <Download size={20} /> Open Browser
           </button>
        )}

        {/* iOS: Visual Instructions */}
        {platform === 'ios' && (
          <div className="mb-6 text-left space-y-4 bg-gray-100 p-4 rounded-xl border border-gray-200">
             <div className="flex items-start gap-3">
                <div className="bg-gray-300 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">1</div>
                <p className="text-sm font-medium text-gray-600">
                  Tap the <MoreHorizontal size={14} className="inline mx-1 text-black" /> or <Share size={14} className="inline mx-1 text-black" /> menu button.
                </p>
             </div>
             <div className="flex items-start gap-3">
                <div className="bg-gray-300 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">2</div>
                <p className="text-sm font-medium text-gray-600">
                  Select <span className="font-bold text-[#013E37]">Open in Safari</span> or <span className="font-bold text-[#013E37]">Open in Browser</span>.
                </p>
             </div>
          </div>
        )}

         {/* DIVIDER */}
         <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {platform === 'ios' ? 'Or Copy Link' : 'Or'}
            </span>
            <div className="flex-grow border-t border-gray-300"></div>
         </div>

        {/* FALLBACK COPY BUTTON */}
        <button 
          onClick={copyToClipboard}
          className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-xl transition-colors ${
             copied 
               ? 'bg-green-100 text-green-700 border border-green-200' 
               : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-[#013E37]'
          }`}
        >
          {copied ? <CheckCircle size={16}/> : <Copy size={16} />}
          {copied ? "Link Copied to Clipboard!" : "Copy Link"}
        </button>
      </div>

      {/* iOS FOOTER HINT */}
      {platform === 'ios' && (
        <p className="mt-8 text-white/40 text-[10px] uppercase font-bold tracking-widest">
          Paste into Safari to install
        </p>
      )}

    </div>
  );
};