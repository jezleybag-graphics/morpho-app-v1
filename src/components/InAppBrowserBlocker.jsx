import React, { useState, useEffect } from 'react';
import { Download, Copy, CheckCircle, ExternalLink } from 'lucide-react';

export const InAppBrowserBlocker = () => {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Simple check: Is it iOS?
    const isIosDevice = /iphone|ipad|ipod/.test(ua.toLowerCase());

    // Detect In-App Browsers (FB, Messenger, Instagram)
    const isFacebook = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);
    const isInstagram = (ua.indexOf("Instagram") > -1);
    const isMessenger = (ua.indexOf("Messenger") > -1); 
    
    // Block only if in Facebook/Messenger/Instagram AND on Android
    // (We skip iOS because they have a different overlay solution)
    if ((isFacebook || isInstagram || isMessenger) && !isIosDevice) {
      setIsInAppBrowser(true);
    }
  }, []);

  const openDefaultBrowser = () => {
    // 1. Get current URL without protocol (http:// or https://)
    let url = window.location.href.replace(/^https?:\/\//, '');
    
    // 2. Clean URL to avoid duplicate params from previous attempts
    url = url.split('?')[0];

    // 3. Construct the "Browser Neutral" Android Intent
    // CRITICAL: We DO NOT include "package=com.android.chrome".
    // This tells Android: "Open this HTTPS link in whatever browser the user prefers."
    // We add 'trigger_install=true' so the next page knows to auto-open the install popup.
    const intentUrl = `intent://${url}?trigger_install=true#Intent;scheme=https;S.browser_fallback_url=${window.location.href};end`;

    window.location.href = intentUrl;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isInAppBrowser) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#013E37] flex flex-col items-center justify-center p-6 text-center animate-fade-in font-poppins">
      
      {/* Icon */}
      <div className="bg-white/10 p-4 rounded-full mb-6">
        <ExternalLink size={48} className="text-[#F4F3F2]" />
      </div>

      <h1 className="text-3xl font-black text-[#F4F3F2] mb-4">
        Continue to App
      </h1>
      
      <p className="text-[#F4F3F2]/80 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
        For the best experience, we need to open this in your main browser.
      </p>

      {/* INSTRUCTIONS CARD */}
      <div className="bg-[#F4F3F2] w-full max-w-sm rounded-3xl p-6 text-gray-900 shadow-2xl relative">
        
        <button 
           onClick={openDefaultBrowser}
           className="w-full bg-[#013E37] text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform mb-4 flex items-center justify-center gap-2"
         >
           Continue to Browser
         </button>

         <p className="text-xs text-gray-400 font-bold mb-4">OR</p>

        {/* Fallback Copy Button */}
        <button 
          onClick={copyToClipboard}
          className="w-full flex items-center justify-center gap-2 text-gray-500 font-bold text-sm hover:text-[#013E37] transition-colors"
        >
          {copied ? <CheckCircle size={16} className="text-green-600"/> : <Copy size={16} />}
          {copied ? "Link Copied!" : "Copy Link manually"}
        </button>
      </div>

    </div>
  );
};