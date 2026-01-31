import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  MessageCircle,
  CheckCircle,
  X,
  ShoppingBag,
} from 'lucide-react';

// --- LOCAL IMPORTS ---
import { formatDate } from '../utils';
import { ChatWindow } from './Chat';

// ==========================================
// HELPER: PARSE ITEMS SAFELY
// ==========================================
const parseItems = (itemsData) => {
  if (!itemsData) return [];

  // 1. If it's already an array (Local State), return it
  if (Array.isArray(itemsData)) {
    return itemsData.map(item => ({
      ...item,
      quantity: parseInt(item.quantity) || 1, // Ensure number
      totalPrice: item.totalPrice || 0
    }));
  }

  // 2. If it's a String (Database Format: "2x Coffee\n1x Cake"), Parse it
  if (typeof itemsData === 'string') {
    return itemsData.split('\n').map((line) => {
      // Regex to find "2x Name"
      const match = line.match(/^(\d+)x\s+(.+)$/);
      if (match) {
        return {
          quantity: parseInt(match[1]),
          name: match[2],
          totalPrice: 0, // Price might not be in string, set 0 or handle logic
          selectedVariant: '',
          selectedAddOns: []
        };
      }
      return { quantity: 1, name: line, totalPrice: 0, selectedAddOns: [] };
    });
  }

  return [];
};

// ==========================================
// 1. ORDER TRACKING CARD
// ==========================================

export const OrderTracking = ({ order, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- FIX 1: Normalize Items (Handle String vs Array) ---
  const normalizedItems = useMemo(() => parseItems(order.items), [order.items]);

  // --- FIX 2: Calculate Total Quantity (Sum of '2x', '1x') ---
  const itemCount = useMemo(() => {
    return normalizedItems.reduce((total, item) => total + item.quantity, 0);
  }, [normalizedItems]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-700';
      case 'preparing': return 'bg-amber-100 text-amber-700';
      case 'ontheway': return 'bg-purple-100 text-purple-700';
      case 'arrived': return 'bg-[#013E37]/10 text-[#013E37] ring-2 ring-[#013E37]/50';
      case 'delivered': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusProgress = (status) => {
    switch (status) {
      case 'placed': return 'w-1/4';
      case 'preparing': return 'w-2/4';
      case 'ontheway': return 'w-3/4';
      case 'arrived': return 'w-[90%]';
      case 'delivered': return 'w-full';
      default: return 'w-0';
    }
  };

  if (!order) return null;

  return (
    <div
      className={`border rounded-3xl p-5 shadow-sm relative overflow-hidden transition-all bg-white mb-4 ${
        order.status === 'arrived'
          ? 'border-[#013E37] ring-2 ring-[#013E37]/10'
          : 'border-gray-100'
      }`}
    >
      {/* --- HEADER --- */}
      <div
        className="flex justify-between items-start mb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-300 tracking-widest">
              #{String(order.id || order.orderId).slice(-4)}
            </span>
            {isExpanded ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </div>
          
          {/* --- FIX 3: Dynamic Count & Grammar --- */}
          <div className="font-bold text-gray-900 text-lg mt-0.5">
            {itemCount} {itemCount === 1 ? 'Item' : 'Items'} • ₱{order.total}
          </div>
          
          <div className="text-[10px] text-gray-400 font-medium">
            {formatDate(order.timestamp) || 'Recently'}
          </div>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
            order.status
          )}`}
        >
          {order.status === 'arrived' ? 'Rider Arrived' : order.status}
        </span>
      </div>

      {/* --- PROGRESS BAR --- */}
      <div className="relative pt-2 pb-1">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-[#013E37] rounded-full transition-all duration-1000 ease-out ${getStatusProgress(
              order.status
            )}`}
          ></div>
        </div>

        {/* Status Text & Chat Button */}
        <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-[#013E37] font-bold">
            {order.status === 'placed' && 'Order Received'}
            {order.status === 'preparing' && 'Kitchen is preparing'}
            {order.status === 'ontheway' && 'On the way to you'}
            {order.status === 'arrived' && 'Rider is here!'}
            {order.status === 'delivered' && 'Delivered'}
          </p>

          {/* CHAT BUTTON - Only shows when On The Way */}
          {order.status === 'ontheway' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChatOpen(true);
              }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg hover:bg-blue-700 transition-colors"
            >
              <MessageCircle size={14} /> Message
            </button>
          )}
        </div>
      </div>

      {/* --- EXPANDED DETAILS --- */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-fade-in">
          <div className="space-y-3">
            {/* USE NORMALIZED ITEMS HERE */}
            {normalizedItems.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between text-sm items-start"
              >
                <div className="flex gap-3">
                  <span className="font-bold text-[#013E37] bg-[#013E37]/10 px-2 py-0.5 rounded-md h-fit text-xs">
                    {item.quantity}x
                  </span>
                  <div>
                    <span className="text-gray-800 font-medium block">
                      {item.name}
                    </span>
                    {(item.selectedVariant ||
                      (item.selectedAddOns && item.selectedAddOns.length > 0)) && (
                      <p className="text-xs text-gray-500">
                        {item.selectedVariant}{' '}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 &&
                          `+ ${item.selectedAddOns
                            .map((a) => a.name)
                            .join(', ')}`}
                      </p>
                    )}
                  </div>
                </div>
                {/* Only show price if it exists (Strings from DB might not have item-level price) */}
                {item.totalPrice > 0 && (
                  <span className="text-gray-600 font-bold text-xs">
                    ₱{item.totalPrice}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Confirm Receipt Button */}
          {order.status === 'delivered' && (
            <div className="mt-5 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(order.id);
                }}
                className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800"
              >
                <CheckCircle size={16} /> Confirm Receipt
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- CHAT POPUP --- */}
      {isChatOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ChatWindow
            orderId={order.id}
            closeChat={() => setIsChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. STATUS POPUP (The Modal Wrapper)
// ==========================================

export const StatusPopup = ({ activeOrders, onClose, onDismiss }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto"
        onClick={onClose}
      ></div>
      <div className="bg-[#F4F3F2] w-full max-w-md h-[80vh] sm:h-auto sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp pointer-events-auto relative z-10">
        {/* Handle for slide effect */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        <div className="p-5 flex justify-between items-center bg-[#F4F3F2]">
          <div>
            <h2 className="font-extrabold text-2xl text-gray-900">
              Active Orders
            </h2>
            <p className="text-gray-400 text-xs">
              Track your delivery in real-time
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
          {activeOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag size={32} className="opacity-30" />
              </div>
              <p>No active orders currently</p>
            </div>
          ) : (
            activeOrders.map((order) => (
              <OrderTracking
                key={order.id}
                order={order}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};