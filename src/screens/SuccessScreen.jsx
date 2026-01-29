import React from 'react';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';

const SuccessScreen = ({ onNavigateHome }) => {
  return (
    <div className="fixed inset-0 bg-[#013E37] z-50 flex flex-col items-center justify-center p-6 text-white animate-fade-in font-poppins">
      
      {/* Animated Icon */}
      <div className="bg-white/10 p-6 rounded-full mb-6 animate-bounce">
        <CheckCircle size={64} className="text-[#F4F3F2]" />
      </div>

      <h1 className="text-3xl font-black mb-2 text-center">Order Placed!</h1>
      <p className="text-white/70 text-center mb-8 font-opensans">
        We have received your order. <br/>
        You can track its status in the "Active Orders" tab.
      </p>

      {/* Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={onNavigateHome}
          className="w-full bg-[#F4F3F2] text-[#013E37] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <Home size={20} />
          Back to Menu
        </button>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-8 text-white/30 text-xs font-opensans">
        Morpho Cafe • Cuyapo
      </div>
    </div>
  );
};

export default SuccessScreen;