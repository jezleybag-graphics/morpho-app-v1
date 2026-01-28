import React, { useState } from 'react';
import { X, Truck, AlertCircle, Home, CheckCircle } from 'lucide-react';

// --- LOCAL IMPORTS ---
import { ANNOUNCEMENT } from '../data';

// ==========================================
// 1. ADDRESS DETAILS FORM
// ==========================================

export const AddressDetailsForm = ({ addressData, onConfirm }) => {
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState(addressData?.road || '');
  const [district, setDistrict] = useState(addressData?.district || '');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-[#013E37]/5 p-4 rounded-2xl border border-[#013E37]/10 flex items-center gap-4">
        <div className="bg-[#F4F3F2] p-3 rounded-full text-[#013E37] shadow-sm">
          <Home size={22} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Almost Done!</h3>
          <p className="text-xs text-gray-500">
            Please provide exact address details.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
            House / Unit / Building No.
          </label>
          <input
            autoFocus
            className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-bold text-lg mt-1 focus:ring-2 focus:ring-[#013E37] outline-none transition-all"
            placeholder="e.g. 123-A"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
            Street Name
          </label>
          <input
            className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-medium mt-1 focus:ring-2 focus:ring-[#013E37] outline-none transition-all"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Street Name"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
            Barangay / District / Purok
          </label>
          <input
            className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-medium mt-1 focus:ring-2 focus:ring-[#013E37] outline-none transition-all"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="District / Purok"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
            Municipality / Province
          </label>
          <input
            readOnly
            className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-100 text-gray-500 font-bold mt-1"
            value="Cuyapo, Nueva Ecija"
          />
        </div>
      </div>

      <button
        disabled={!houseNumber || !street || !district}
        onClick={() => onConfirm(houseNumber, street, district)}
        className="w-full bg-[#013E37] text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl mt-6 disabled:bg-gray-300 active:scale-[0.98] transition-all"
      >
        Save Address
      </button>
    </div>
  );
};

// ==========================================
// 2. ANNOUNCEMENT MODAL
// ==========================================

export const AnnouncementModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-[#F4F3F2] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-scaleIn">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 bg-black/20 text-white p-2 rounded-full z-10 hover:bg-black/30 backdrop-blur-md"
      >
        <X size={20} />
      </button>

      {ANNOUNCEMENT.image && (
        <div className="h-48 bg-gray-200 relative">
          <img
            src={ANNOUNCEMENT.image}
            className="w-full h-full object-cover"
            alt="Promo"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <span className="bg-[#013E37] px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 inline-block">
              Promo
            </span>
            <h3 className="text-2xl font-bold leading-none">
              {ANNOUNCEMENT.title}
            </h3>
          </div>
        </div>
      )}

      <div className="p-6">
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          {ANNOUNCEMENT.message}
        </p>
        <button
          onClick={onClose}
          className="w-full bg-[#013E37] text-[#F4F3F2] py-3.5 rounded-2xl font-bold shadow-lg shadow-[#013E37]/20 hover:bg-[#013E37]/90 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  </div>
);

// ==========================================
// 3. RIDER ARRIVED MODAL
// ==========================================

export const RiderArrivedModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-fade-in">
    <div className="bg-[#F4F3F2] rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center relative overflow-hidden animate-bounce-in">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#013E37]/60 to-[#013E37]"></div>
      <div className="mx-auto w-24 h-24 bg-[#013E37]/5 rounded-full flex items-center justify-center mb-6 text-[#013E37] shadow-inner relative">
        <div className="absolute inset-0 rounded-full border-4 border-[#013E37]/10 animate-ping opacity-20"></div>
        <Truck size={48} />
      </div>
      <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
        Rider is Here!
      </h3>
      <p className="text-gray-500 mb-8 leading-relaxed text-sm">
        Your rider has arrived at your location. Please meet them to pick up
        your order.
      </p>
      <button
        onClick={onClose}
        className="w-full py-4 rounded-2xl font-bold text-[#F4F3F2] bg-gray-900 hover:bg-black shadow-xl active:scale-[0.98] transition-transform"
      >
        Okay, I'm coming!
      </button>
    </div>
  </div>
);

// ==========================================
// 4. CONFIRMATION MODAL
// ==========================================

export const ConfirmationModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-[#F4F3F2] rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center animate-scaleIn">
      <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-5 text-amber-500 border-4 border-amber-100">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-extrabold text-gray-900 mb-2">
        Place Order?
      </h3>
      <p className="text-gray-500 text-sm mb-8 px-2">
        You cannot cancel the order once it was placed, but you can still add
        more orders later.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3.5 rounded-2xl font-bold text-[#F4F3F2] bg-[#013E37] hover:bg-[#013E37]/90 shadow-lg shadow-[#013E37]/20 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);