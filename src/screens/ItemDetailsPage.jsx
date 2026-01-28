import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Minus,
  ShoppingBag,
  Flame,
  Snowflake,
  Check,
  ChevronDown,
} from 'lucide-react';

export default function ItemDetailsPage({ item, onBack, onAdd }) {
  const variants = item.variants || [];

  // --- CUSTOM SORTING LOGIC ---
  // This ensures specific items always appear in the order you want
  const addons = [...(item.addons || [])].sort((a, b) => {
    // RULE 1: "Dip" always comes first
    if (a.name === 'Dip') return -1;
    if (b.name === 'Dip') return 1;

    // RULE 2: You can add more rules here later (e.g. Rice second)
    // if (a.name === 'Plain Rice') return -1;

    return 0; // Leave everything else in the order it was saved
  });

  const [selectedVariant, setSelectedVariant] = useState(
    variants.length > 0 ? variants[0] : null
  );
  // selectedAddOns structure: [ { name, price, choice: 'Vanilla' } ]
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [unavailableAction, setUnavailableAction] = useState('Remove it');

  const basePrice = selectedVariant ? selectedVariant.price : item.price;
  const addonsTotal = selectedAddOns.reduce(
    (sum, addon) => sum + addon.price,
    0
  );
  const itemTotal = (basePrice + addonsTotal) * quantity;

  // --- HANDLERS ---

  // Helper: Count how many times an add-on is selected (for Espresso Shots)
  const getAddonCount = (addonName) =>
    selectedAddOns.filter((a) => a.name === addonName).length;

  const handleAddOnToggle = (addon) => {
    // Check if it's an Espresso Shot (needs counter logic)
    const isCounter =
      addon.name.toLowerCase().includes('shot') ||
      addon.name.toLowerCase().includes('espresso');

    if (isCounter) {
      // Logic handled by updateAddonQuantity, but if clicked on main body, add 1
      updateAddonQuantity(addon, 1);
    } else {
      // Standard Toggle (Check/Uncheck)
      const exists = selectedAddOns.find((a) => a.name === addon.name);
      if (exists) {
        setSelectedAddOns(selectedAddOns.filter((a) => a.name !== addon.name));
      } else {
        const defaultChoice =
          addon.options && addon.options.length > 0 ? addon.options[0] : null;
        setSelectedAddOns([
          ...selectedAddOns,
          { ...addon, choice: defaultChoice },
        ]);
      }
    }
  };

  const updateAddonQuantity = (addon, delta) => {
    const currentCount = getAddonCount(addon.name);
    // Limit to reasonable amount (e.g., 0 to 5 shots)
    const newCount = Math.min(Math.max(0, currentCount + delta), 5);

    // Filter out ALL instances of this addon
    const otherAddons = selectedAddOns.filter((a) => a.name !== addon.name);

    // Re-add the new number of instances
    const newInstances = Array(newCount)
      .fill(addon)
      .map((a) => ({ ...a })); // Clone objects

    setSelectedAddOns([...otherAddons, ...newInstances]);
  };

  const handleOptionChange = (addonName, newOption) => {
    // Only update the first instance found (standard logic for dropdowns)
    const index = selectedAddOns.findIndex((a) => a.name === addonName);
    if (index !== -1) {
      const newAddons = [...selectedAddOns];
      newAddons[index] = { ...newAddons[index], choice: newOption };
      setSelectedAddOns(newAddons);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in font-opensans">
      {/* 1. Header Image (Fixed Aspect Ratio) */}
      <div className="relative h-72 w-full bg-gray-100 shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
            No Image
          </div>
        )}

        {/* Back Button (Glassmorphism) */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2.5 bg-white/30 backdrop-blur-md border border-white/20 rounded-full text-white shadow-sm hover:bg-white/40 transition-all active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-48">
        {/* ^^^ FIX: Increased pb-48 to ensure footer doesn't hide content */}

        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins leading-tight max-w-[70%]">
            {item.name}
          </h1>
          <span className="text-2xl font-black text-[#013E37]">
            ₱{basePrice}
          </span>
        </div>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {item.description || 'Deliciousness in every bite.'}
        </p>

        {/* VARIANTS SECTION */}
        {variants.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-widest opacity-80">
              Choose Variant
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {variants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedVariant(v)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    selectedVariant?.name === v.name
                      ? 'border-[#013E37] bg-[#013E37]/5 text-[#013E37] shadow-sm ring-1 ring-[#013E37]'
                      : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {v.name === 'Hot' && (
                      <Flame size={16} className="text-orange-500" />
                    )}
                    {v.name === 'Iced' && (
                      <Snowflake size={16} className="text-blue-500" />
                    )}
                    {v.name}
                  </div>
                  <span className="text-xs font-semibold opacity-70">
                    ₱{v.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ADD-ONS SECTION */}
        {addons.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-widest opacity-80">
              Customize
            </h3>
            <div className="space-y-3">
              {addons.map((addon, idx) => {
                const isEspresso =
                  addon.name.toLowerCase().includes('shot') ||
                  addon.name.toLowerCase().includes('espresso');
                const count = getAddonCount(addon.name);
                const selected = selectedAddOns.find(
                  (a) => a.name === addon.name
                );
                const isSelected = !!selected || count > 0;

                return (
                  <div
                    key={idx}
                    className={`border rounded-2xl transition-all overflow-hidden ${
                      isSelected
                        ? 'border-[#013E37] bg-[#013E37]/5'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="w-full p-3.5 flex items-center justify-between">
                      {/* Name & Toggle */}
                      <div
                        className="flex items-center gap-3 flex-1"
                        onClick={() => !isEspresso && handleAddOnToggle(addon)}
                      >
                        {!isEspresso && (
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-[#013E37] border-[#013E37]'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span
                            className={`font-bold text-sm ${
                              isSelected ? 'text-[#013E37]' : 'text-gray-700'
                            }`}
                          >
                            {addon.name}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            +₱{addon.price}
                          </span>
                        </div>
                      </div>

                      {/* Espresso Counter OR Just Price */}
                      {isEspresso ? (
                        <div className="flex items-center bg-white rounded-lg border border-gray-200 h-8 shadow-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAddonQuantity(addon, -1);
                            }}
                            className={`w-8 h-full flex items-center justify-center transition-colors ${
                              count === 0
                                ? 'text-gray-300'
                                : 'text-[#013E37] hover:bg-gray-50'
                            }`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-gray-900">
                            {count}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAddonQuantity(addon, 1);
                            }}
                            className="w-8 h-full flex items-center justify-center text-[#013E37] hover:bg-gray-50 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        // If not espresso, just allow clicking the whole row (handled by wrapper)
                        <div
                          onClick={() => handleAddOnToggle(addon)}
                          className="h-full flex items-center pl-4"
                        >
                          {/* Empty hit area to ensure row click works */}
                        </div>
                      )}
                    </div>

                    {/* Options Dropdown (Only if selected AND has options) */}
                    {isSelected &&
                      !isEspresso &&
                      addon.options &&
                      addon.options.length > 0 && (
                        <div className="px-3 pb-3 pl-12 animate-fade-in">
                          <div className="relative">
                            <select
                              className="w-full p-2.5 pr-8 text-xs font-medium border border-[#013E37]/20 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#013E37] appearance-none"
                              value={selected.choice}
                              onChange={(e) =>
                                handleOptionChange(addon.name, e.target.value)
                              }
                            >
                              {addon.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* UNAVAILABLE ACTION */}
        <div className="mb-4">
          <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-widest opacity-80">
            If item is unavailable
          </h3>
          <div className="flex gap-2 flex-wrap">
            {['Remove it', 'Call me', 'Cancel Order'].map((action) => (
              <button
                key={action}
                onClick={() => setUnavailableAction(action)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  unavailableAction === action
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Fixed Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="flex items-center justify-between mb-4 px-2">
          {/* Main Quantity */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-95 transition-all"
            >
              <Minus size={18} />
            </button>
            <span className="font-bold text-gray-900 w-10 text-center text-lg">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 flex items-center justify-center bg-[#013E37] text-white rounded-lg shadow-sm active:scale-95 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Total Price
            </p>
            <p className="text-3xl font-black text-[#013E37] leading-none">
              ₱{itemTotal}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            onAdd(
              item,
              selectedAddOns,
              quantity,
              selectedVariant,
              unavailableAction
            )
          }
          className="w-full bg-[#013E37] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#013E37]/20 active:scale-[0.98] transition-transform flex justify-center items-center gap-3"
        >
          <ShoppingBag size={22} /> Add to Bag
        </button>
      </div>
    </div>
  );
}
