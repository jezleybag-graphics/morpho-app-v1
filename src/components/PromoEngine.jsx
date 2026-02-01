import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, Zap, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const PromoEngine = ({ 
  cart, 
  deliveryFee, 
  distanceKm, 
  onApplyDiscount 
}) => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [selectedOption, setSelectedOption] = useState(null); // 'delivery', 'bundle', 'code'
  const [appliedCode, setAppliedCode] = useState(null);
  
  // --- 1. FETCH ACTIVE PROMOS ---
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const q = query(collection(db, 'promotions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPromos(data);
      } catch (error) {
        console.error("Promo Fetch Error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  // --- 2. CALCULATE POSSIBILITIES ---
  const options = useMemo(() => {
    const opts = [];
    const now = new Date();

    // Helper: Is Date Valid?
    const isValidDate = (p) => {
      if (p.startDate && new Date(p.startDate) > now) return false;
      if (p.endDate && new Date(p.endDate) < now) return false;
      return true;
    };

    // A. FREE DELIVERY LOGIC
    const deliveryPromo = promos.find(p => 
      p.type === 'conditional' && 
      p.subtype === 'free_delivery' && 
      isValidDate(p)
    );

    if (deliveryPromo) {
      const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      const isWithinDistance = distanceKm <= deliveryPromo.maxDistanceKm;
      const hasMinItems = itemCount >= deliveryPromo.minItemCount;

      if (isWithinDistance && hasMinItems) {
        opts.push({
          id: deliveryPromo.id,
          type: 'delivery',
          title: deliveryPromo.title,
          amount: deliveryFee, // Savings = Full Delivery Fee
          description: `Free delivery within ${deliveryPromo.maxDistanceKm}km`
        });
      }
    }

    // B. BUNDLE LOGIC
    const bundlePromos = promos.filter(p => 
      p.type === 'conditional' && 
      p.subtype === 'bundle' &&
      isValidDate(p)
    );

    bundlePromos.forEach(p => {
      const triggerItem = cart.find(i => i.id === p.triggerItemId);
      const targetItem = cart.find(i => i.id === p.targetItemId);

      if (triggerItem && targetItem) {
        // Limit pairs by the smaller quantity of the two
        const pairs = Math.min(triggerItem.quantity, targetItem.quantity);
        const discountPerItem = (targetItem.price * (p.discountPercent / 100));
        const totalSavings = discountPerItem * pairs;

        opts.push({
          id: p.id,
          type: 'bundle',
          title: p.title,
          amount: totalSavings,
          description: `Saved ${p.discountPercent}% on ${pairs} pair(s)`
        });
      }
    });

    // C. PROMO CODE LOGIC
    if (appliedCode) {
      opts.push({
        id: appliedCode.id,
        type: 'code',
        title: `Code: ${appliedCode.code}`,
        amount: appliedCode.savings,
        description: `${appliedCode.discountPercent}% Off`
      });
    }

    return opts;
  }, [promos, cart, deliveryFee, distanceKm, appliedCode]);

  // --- 3. HANDLE CODE SUBMIT ---
  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const code = promoCodeInput.toUpperCase().trim();
    const promo = promos.find(p => p.type === 'code' && p.code === code && p.isActive);
    
    // Validations
    if (!promo) return alert("Invalid or inactive code.");
    
    // Check Dates
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) return alert("Promo not started yet.");
    if (promo.endDate && new Date(promo.endDate) < now) return alert("Promo expired.");

    // Check Min Spend
    const cartTotal = cart.reduce((sum, i) => sum + i.totalPrice, 0);
    if (promo.minSpend > 0 && cartTotal < promo.minSpend) {
      return alert(`Minimum spend of ₱${promo.minSpend} required.`);
    }

    // Calculate Savings
    let savings = cartTotal * (promo.discountPercent / 100);
    if (promo.maxCap > 0) savings = Math.min(savings, promo.maxCap);

    setAppliedCode({ ...promo, savings });
    setPromoCodeInput('');
    
    // Auto-select this new code
    setSelectedOption('code');
  };

  // --- 4. REPORT TO PARENT ---
  useEffect(() => {
    if (!selectedOption) {
      onApplyDiscount(0, null);
      return;
    }

    const activeDeal = options.find(o => o.type === selectedOption);
    if (activeDeal) {
      onApplyDiscount(activeDeal.amount, activeDeal);
    } else {
      onApplyDiscount(0, null);
    }
  }, [selectedOption, options, onApplyDiscount]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 animate-fade-in font-poppins">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="text-[#C8A165]" size={20} />
        <h3 className="font-bold text-[#013E37]">Deals & Discounts</h3>
      </div>

      {loading ? (
        <div className="py-4 text-center text-gray-400"><Loader2 className="animate-spin inline" /></div>
      ) : (
        <div className="space-y-4">
          
          {/* INPUT CODE */}
          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <input 
              value={promoCodeInput}
              onChange={e => setPromoCodeInput(e.target.value)}
              placeholder="Enter Promo Code"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold uppercase focus:outline-none focus:border-[#013E37]"
            />
            <button 
              type="submit"
              disabled={!promoCodeInput}
              className="bg-[#013E37] text-white px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              APPLY
            </button>
          </form>

          {/* RADIO SELECTOR */}
          {options.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Available Savings (Pick One)</p>
              {options.map(opt => (
                <div 
                  key={opt.id + opt.type}
                  onClick={() => setSelectedOption(opt.type)}
                  className={`p-3 rounded-xl border-2 cursor-pointer flex justify-between items-center transition-all ${
                    selectedOption === opt.type 
                      ? 'border-[#013E37] bg-[#013E37]/5' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === opt.type ? 'border-[#013E37]' : 'border-gray-300'
                    }`}>
                      {selectedOption === opt.type && <div className="w-2.5 h-2.5 bg-[#013E37] rounded-full" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{opt.title}</p>
                      <p className="text-[10px] text-gray-500">{opt.description}</p>
                    </div>
                  </div>
                  <span className="font-black text-[#013E37]">-₱{opt.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center text-xs text-gray-400 py-2 border-t border-dashed border-gray-200 mt-2">
               No applicable deals found.
             </div>
          )}
        </div>
      )}
    </div>
  );
};