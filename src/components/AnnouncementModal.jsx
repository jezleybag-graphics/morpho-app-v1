import React, { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 

export const AnnouncementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Listen to the specific document where Admin saves data
    const unsub = onSnapshot(doc(db, 'settings', 'announcement'), (doc) => {
      if (doc.exists()) {
        const settings = doc.data();
        
        // LOGIC:
        // 1. Must be Active
        // 2. User hasn't seen THIS specific update (using timestamp)
        const updateId = settings.updatedAt?.seconds || 'initial';
        const hasSeen = sessionStorage.getItem(`seen_alert_${updateId}`);
        
        if (settings.isActive && !hasSeen) {
          setData(settings);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      }
    });

    return () => unsub();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark this specific update as seen so it doesn't pop up again on refresh
    if (data?.updatedAt?.seconds) {
      sessionStorage.setItem(`seen_alert_${data.updatedAt.seconds}`, 'true');
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-bounce-in relative">
        
        {/* Decorative Header */}
        <div className="bg-[#013E37] h-24 relative overflow-hidden flex items-center justify-center">
           <div className="absolute w-64 h-64 bg-[#C8A165]/20 rounded-full -top-32 -right-10 blur-xl"></div>
           <div className="absolute w-64 h-64 bg-[#C8A165]/20 rounded-full -bottom-32 -left-10 blur-xl"></div>
           <Megaphone size={48} className="text-white relative z-10 drop-shadow-lg" />
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-black text-[#013E37] mb-3 leading-tight">
            {data.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {data.message}
          </p>

          <button
            onClick={handleClose}
            className="w-full bg-[#013E37] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-[#013E37]/20 active:scale-95 transition-all"
          >
            Got it, thanks!
          </button>
        </div>

        {/* Close X */}
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};