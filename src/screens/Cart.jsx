import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Trash2, CreditCard, Banknote, MapPin, Loader2, ChevronRight, 
  Zap, Clock, ChevronDown 
} from 'lucide-react';

// LOCAL IMPORTS
import { GOOGLE_SCRIPT_URL } from '../firebase';
import { LocationPicker, ReadOnlyMap } from '../components/Maps';
import { TIME_SLOTS } from '../data';
import { convertToMinutes } from '../utils';

// Helper for time slots
const getAvailableSlots = (mode, isLater) => {
  const now = new Date();
  const phHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(now));
  const phMinute = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', minute: 'numeric' }).format(now));
  const currentTotalMinutes = (phHour === 24 ? 0 : phHour) * 60 + phMinute;
  const isLate = phHour >= 22;
  const buffer = isLater ? 30 : 0;

  return TIME_SLOTS.filter(slot => {
    if (slot === 'ASAP') return !isLater;
    if (isLate) return true;
    return convertToMinutes(slot) > currentTotalMinutes + buffer;
  });
};

const Cart = ({ 
  cartItems, 
  userProfile, 
  onClose, 
  onRemoveItem, 
  onSuccess 
}) => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  
  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); 
  const [orderMode, setOrderMode] = useState('Delivery');
  const [timeOption, setTimeOption] = useState('now'); 
  const [selectedTime, setSelectedTime] = useState('ASAP');
  
  // Location State
  const [address, setAddress] = useState(userProfile?.address || '');
  const [deliveryFee, setDeliveryFee] = useState(Number(userProfile?.deliveryFee) || 0);
  const [mapLink, setMapLink] = useState(userProfile?.mapLink || '');
  const [distanceKm, setDistanceKm] = useState(Number(userProfile?.distanceKm) || 0);
  const [coords, setCoords] = useState(null);

  // REFS
  const pollTimer = useRef(null);
  const paymentWindowRef = useRef(null);
  
  // SAFETY LOCK: Prevents double-saving if internet is slow
  const isSaving = useRef(false); 
  
  // PERSIST ORDER ID (So we don't lose it during re-renders)
  const orderIdRef = useRef(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);

  useEffect(() => {
    if (userProfile?.mapLink) {
      const match = userProfile.mapLink.match(/q=([-0-9.]+),([-0-9.]+)/);
      if (match) {
        setCoords({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      }
    }
  }, [userProfile]);

  // --- NEW HELPER: STRICT FORMATTER ---
  const formatOrderSummary = (items) => {
    return items.map(item => {
      // 1. Base Item String
      let itemString = `${item.qty || item.quantity}x ${item.name}`;
      if (item.selectedVariant) itemString += ` [${item.selectedVariant}]`;

      // 2. Process Addons
      if (item.selectedAddOns && item.selectedAddOns.length > 0) {
        const addonString = item.selectedAddOns.map(addon => {
          const addonQty = addon.quantity || addon.qty || 1;
          return addonQty > 1 ? `${addonQty}x ${addon.name}` : addon.name;
        }).join(', ');
        itemString += ` (+ ${addonString})`;
      }

      // 3. Process N/A Action (NEW: Sends data to Admin App)
      // Checks 'unavailableAction' which you likely set in ItemDetailsPage
      if (item.unavailableAction) {
        itemString += ` {If N/A: ${item.unavailableAction}}`;
      }

      return itemString;
    }).join('\n'); 
  };

  // --- HELPER: FINALIZE ORDER (Local UI Update) ---
  const finalizeOrder = (status) => {
    const finalFee = orderMode === 'Delivery' ? deliveryFee : 0;
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.finalPrice || item.price) * Number(item.qty || item.quantity)), 0);
    
    // Create items summary string using the NEW Formatter
    const itemsSummary = formatOrderSummary(cartItems);

    const newOrder = {
        id: orderIdRef.current,
        status: status, // 'placed'
        
        // VISUAL DETAILS (Needed for Active Orders Card)
        items: cartItems,
        itemsSummary: itemsSummary, 
        total: subtotal + finalFee,
        
        // DELIVERY/PICKUP DETAILS
        orderMode: orderMode,
        address: orderMode === 'Delivery' ? address : 'N/A',
        time: selectedTime,
        
        // CUSTOMER DETAILS
        name: userProfile.name,
        customerPhone: userProfile.phone,
        paymentMethod: paymentMethod, // 'ONLINE' or 'COD'
        
        timestamp: new Date().toISOString()
    };
    
    onSuccess(newOrder); // Send complete object to App.jsx
  };

  // --- HELPER: SAVE TO SHEET (Cloud Sync) ---
  // This ensures the order exists in the cloud so other devices can see it
  const saveOrderToSheet = async (status, method) => {
    const finalFee = orderMode === 'Delivery' ? deliveryFee : 0;
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.finalPrice || item.price) * Number(item.qty || item.quantity)), 0);
    const total = subtotal + finalFee;
    
    // Create items summary string using the NEW Formatter
    const itemsSummary = formatOrderSummary(cartItems);

    const payload = {
        orderId: orderIdRef.current,
        name: userProfile.name,
        phone: userProfile.phone,
        address: orderMode === 'Delivery' ? address : 'N/A',
        items: itemsSummary,
        total: total,
        payment: method,
        orderMode: orderMode,
        time: selectedTime,
        landmark: "N/A"
    };

    // Send to Google Sheet
    await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
  };

  // --- POLLING LOGIC ---
  useEffect(() => {
    if (waitingForPayment && currentInvoiceId) {
      const checkStatus = async () => {
        // SAFETY LOCK: If we are already saving, DO NOT check again. Wait.
        if (isSaving.current) return;

        try {
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'check_payment',
              invoiceId: currentInvoiceId
            })
          });
          const data = await response.json();
          
          if (data.paymentStatus === 'PAID') {
            clearInterval(pollTimer.current);
            if (paymentWindowRef.current) paymentWindowRef.current.close();
            
            // LOCK THE PROCESS
            isSaving.current = true;
            
            // 1. SAVE TO SHEET (Wait for it to finish)
            await saveOrderToSheet('placed', 'GCash/Maya');

            setWaitingForPayment(false);
            setLoading(false);
            
            // 2. SUCCESS! Pass the order to the main app
            finalizeOrder('placed'); 

          } else if (data.paymentStatus === 'EXPIRED') {
            clearInterval(pollTimer.current);
            if (paymentWindowRef.current) paymentWindowRef.current.close();
            setWaitingForPayment(false);
            setLoading(false);
            alert("Payment session expired. Please try again.");
          }
        } catch (e) {
          console.log("Polling error (ignoring):", e);
          // Note: We do NOT set isSaving=true here, so it retries on next poll
        }
      };

      pollTimer.current = setInterval(checkStatus, 3000);
      return () => { clearInterval(pollTimer.current); };
    }
  }, [waitingForPayment, currentInvoiceId]);


  // --- CALCULATIONS ---
  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.finalPrice || item.price || 0);
    const qty = Number(item.qty || item.quantity || 1);
    return sum + (price * qty);
  }, 0);

  const finalFee = orderMode === 'Delivery' ? deliveryFee : 0;
  const total = subtotal + finalFee;

  // --- HANDLERS ---
  const handleLocationSelect = (locData) => {
    if (locData.fee === -1) {
      alert("Location is too far for delivery!");
      return;
    }
    setAddress(`${locData.streetInfo?.road || ''}, ${locData.streetInfo?.district || ''}, Cuyapo`);
    setDeliveryFee(Number(locData.fee));
    setDistanceKm(Number(locData.distance));
    setMapLink(locData.mapLink);
    setCoords({ lat: locData.lat, lng: locData.lng });
    setIsMapOpen(false);
  };

  const handleOnlineCheckout = async () => {
    const paymentWindow = window.open('', '_blank');
    paymentWindowRef.current = paymentWindow;

    if (paymentWindow) {
      paymentWindow.document.write('<html><body style="background:#F4F3F2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; text-align:center;"><h3>Connecting to Secure Payment...</h3><p>Please wait...</p></body></html>');
    } else {
      alert("Popup blocked! Please allow popups.");
      return;
    }

    setLoading(true);
    isSaving.current = false; // Reset lock for new attempt

    // Create items summary string using the NEW Formatter
    const itemsSummary = formatOrderSummary(cartItems);
    
    // Regenerate ID if needed, or use Ref
    const orderId = orderIdRef.current;

    const payload = {
      action: 'create_payment',
      orderId,
      totalAmount: total,
      customerName: userProfile.name,
      phone: userProfile.phone,
      email: userProfile.email || "guest@morpho.ph",
      itemsSummary,
      orderMode,
      time: selectedTime,
      address: orderMode === 'Delivery' ? address : 'N/A'
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.status === 'success' && data.invoiceUrl) {
        if (paymentWindowRef.current) {
            paymentWindowRef.current.location.href = data.invoiceUrl;
        }
        setCurrentInvoiceId(data.id); 
        setWaitingForPayment(true);
      } else {
        if (paymentWindowRef.current) paymentWindowRef.current.close();
        alert("Payment Error: " + (data.message || "Unknown"));
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      if (paymentWindowRef.current) paymentWindowRef.current.close();
      alert("Connection failed. Try again.");
      setLoading(false);
    }
  };

  const handleCODCheckout = async () => {
    setLoading(true);
    
    // LOCK PROCESS
    if (isSaving.current) return;
    isSaving.current = true;

    // SAVE TO SHEET IMMEDIATELY (This uses the new formatter inside the function)
    await saveOrderToSheet('placed', 'Cash');

    setTimeout(() => {
        setLoading(false);
        // SUCCESS! Pass the order to the main app
        finalizeOrder('placed');
    }, 1500);
  };

  if (!userProfile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none font-poppins">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#F4F3F2] sm:rounded-3xl h-[92dvh] sm:h-[85vh] flex flex-col shadow-2xl pointer-events-auto animate-slideUp overflow-hidden">
        
        {/* Header */}
        <div className="p-5 flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-[#013E37]">{isMapOpen ? "Set Location" : "Checkout"}</h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Morpho Cafe</p>
          </div>
          <button onClick={() => isMapOpen ? setIsMapOpen(false) : onClose()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {isMapOpen ? (
            <div className="h-full flex flex-col">
              <LocationPicker onLocationSelect={handleLocationSelect} />
            </div>
          ) : (
            <div className="p-5 pb-32 space-y-6">
              
              {/* Waiting UI (With Cancel Button) */}
              {waitingForPayment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center animate-fade-in">
                  <Loader2 className="animate-spin mx-auto text-yellow-600 mb-2" />
                  <p className="font-bold text-yellow-800">Processing Payment...</p>
                  <p className="text-xs text-yellow-600 mb-3">Please complete the payment in the popup window.</p>
                  <button 
                    onClick={() => {
                        setWaitingForPayment(false);
                        setLoading(false);
                        isSaving.current = false; // Release lock on cancel
                        if (pollTimer.current) clearInterval(pollTimer.current);
                        if (paymentWindowRef.current) paymentWindowRef.current.close();
                    }}
                    className="text-xs font-bold text-red-500 underline hover:text-red-700"
                  >
                    Cancel Payment
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Items</h3>
                 {cartItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex gap-3">
                            <span className="text-[#013E37] font-bold text-sm">{item.quantity}x</span>
                            <div>
                                <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{item.selectedVariant}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                            <span className="font-bold text-sm">₱{(item.finalPrice || item.price) * (item.quantity || 1)}</span>
                            <button onClick={() => onRemoveItem(idx)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                    </div>
                 ))}
              </div>

              {/* Order Mode */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Type</h3>
                <div className="grid grid-cols-3 gap-2 p-1 bg-white rounded-xl border border-gray-200">
                    {['Delivery', 'Pick Up', 'Dine In'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => { setOrderMode(mode); setTimeOption('now'); setSelectedTime('ASAP'); }}
                            className={`py-2.5 text-xs font-bold rounded-lg transition-all ${orderMode === mode ? 'bg-[#013E37] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
              </div>

              {/* Delivery Location */}
              {orderMode === 'Delivery' && (
                <div className="space-y-2 animate-fade-in">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deliver To</h3>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 relative overflow-hidden group">
                        {coords && (
                           <div className="h-20 w-full mb-3 rounded-xl overflow-hidden opacity-60 grayscale group-hover:grayscale-0 transition-all">
                                <ReadOnlyMap center={[coords.lat, coords.lng]} />
                           </div>
                        )}
                        <div className="flex gap-3 items-start">
                            <MapPin className="text-[#013E37] shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="text-sm font-bold text-gray-800 leading-snug">{address || "No address set"}</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">Distance: {distanceKm}km • Fee: ₱{finalFee}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsMapOpen(true)} className="absolute top-3 right-3 bg-[#013E37]/10 text-[#013E37] text-[10px] font-bold px-2 py-1 rounded-md">CHANGE</button>
                    </div>
                </div>
              )}

              {/* Time Selection */}
              <div className="space-y-2">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {orderMode === 'Dine In' ? 'Serving Time' : orderMode === 'Pick Up' ? 'Pickup Time' : 'Delivery Time'}
                 </h3>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => { setTimeOption('now'); setSelectedTime('ASAP'); }}
                        className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${timeOption === 'now' ? 'border-[#013E37] bg-[#013E37]/5 text-[#013E37]' : 'border-gray-100 bg-white text-gray-400'}`}
                    >
                        <Zap size={14} /> Now
                    </button>
                    <button 
                        onClick={() => { setTimeOption('later'); }}
                        className={`flex-1 py-3 border-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${timeOption === 'later' ? 'border-[#013E37] bg-[#013E37]/5 text-[#013E37]' : 'border-gray-100 bg-white text-gray-400'}`}
                    >
                        <Clock size={14} /> Later
                    </button>
                 </div>
                 {timeOption === 'later' && (
                    <div className="relative animate-fade-in">
                        <select 
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-sm appearance-none outline-none focus:border-[#013E37]"
                        >
                            {getAvailableSlots(orderMode, true).map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                 )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod('ONLINE')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'ONLINE' ? 'border-[#013E37] bg-[#013E37]/5 text-[#013E37]' : 'border-gray-100 bg-white text-gray-400'}`}><CreditCard size={20} /><span className="text-xs font-bold">GCash / Maya</span></button>
                    <button onClick={() => setPaymentMethod('COD')} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === 'COD' ? 'border-[#013E37] bg-[#013E37]/5 text-[#013E37]' : 'border-gray-100 bg-white text-gray-400'}`}><Banknote size={20} /><span className="text-xs font-bold">Cash</span></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {!isMapOpen && (
            <div className="p-5 bg-white border-t border-gray-100 z-10">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-bold text-sm">Total Amount</span>
                    <span className="text-2xl font-black text-[#013E37]">₱{isNaN(total) ? '0.00' : total.toFixed(2)}</span>
                </div>
                <button
                    onClick={paymentMethod === 'ONLINE' ? handleOnlineCheckout : handleCODCheckout}
                    disabled={loading || (orderMode === 'Delivery' && (!address || finalFee === 0))}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl transition-all ${
                        loading || (orderMode === 'Delivery' && (!address || finalFee === 0))
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                        : 'bg-[#013E37] text-white shadow-[#013E37]/20 active:scale-[0.98]'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {waitingForPayment ? 'Processing...' : (paymentMethod === 'ONLINE' ? 'Pay & Order' : 'Place Order')} 
                            <ChevronRight size={18} />
                        </>
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Cart;