import React, { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 

export const AnnouncementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'announcement'), (doc) => {
      if (doc.exists()) {
        const settings = doc.data();
        
        // Logic: Show if active AND not seen yet
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
    if (data?.updatedAt?.seconds) {
      sessionStorage.setItem(`seen_alert_${data.updatedAt.seconds}`, 'true');
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-bounce-in relative">
        
        {/* --- DYNAMIC HEADER --- */}
        {data.image ? (
          // IF IMAGE EXISTS: Show Full Image
          <div className="aspect-square w-full relative bg-gray-100">
             <img 
               src={data.image} 
               className="w-full h-full object-cover" 
               alt="Announcement" 
               onError={(e) => e.target.style.display = 'none'} // Hide if broken link
             />
             {/* Gradient overlay to make sure X button is visible */}
             <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/50 to-transparent"></div>
          </div>
        ) : (
          // NO IMAGE: Show Default Megaphone Header
          <div className="bg-[#013E37] h-24 relative overflow-hidden flex items-center justify-center">
             <div className="absolute w-64 h-64 bg-[#C8A165]/20 rounded-full -top-32 -right-10 blur-xl"></div>
             <div className="absolute w-64 h-64 bg-[#C8A165]/20 rounded-full -bottom-32 -left-10 blur-xl"></div>
             <Megaphone size={48} className="text-white relative z-10 drop-shadow-lg" />
          </div>
        )}

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-black text-[#013E37] mb-3 leading-tight">
            {data.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">
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
          className="absolute top-3 right-3 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors backdrop-blur-sm"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};