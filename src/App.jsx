import React, { useState, useMemo, useEffect } from 'react';
import {
  Loader2,
  ShoppingBag,
  X,
  Plus,
  ChefHat,
  Trash2,
  Clock,
  ChevronDown,
  Zap,
  MapPin,
  User,
  Search,
  Heart,
  WifiOff,
} from 'lucide-react';

// --- SCREENS ---
import LoginScreen from './screens/LoginScreen';
import ItemDetailsPage from './screens/ItemDetailsPage';
import LoadingScreen from './screens/LoadingScreen';
import FavoritesScreen from './screens/FavoritesScreen';

// --- COMPONENTS ---
import { LocationPicker, ReadOnlyMap } from './components/Maps';
import {
  AnnouncementModal,
  RiderArrivedModal,
  ConfirmationModal,
  AddressDetailsForm,
} from './components/Modals';
import { StatusPopup } from './components/Orders';
import { NetworkStatus } from './components/NetworkStatus';
import { InAppBrowserBlocker } from './components/InAppBrowserBlocker';
import { AndroidInstallPrompt } from './components/AndroidInstallPrompt';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';

// --- DATA & UTILS ---
import { db, GOOGLE_SCRIPT_URL } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

import {
  CATEGORIES,
  MENU_ITEMS as FALLBACK_MENU,
  ANNOUNCEMENT,
  BRAND_INFO,
  TIME_SLOTS,
} from './data';
import { convertToMinutes, playNotificationSound } from './utils';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';

export default function App() {
  // 1. STATE DEFINITIONS
  const [user, setUser] = useState(null);
  const [view, setView] = useState('loading');

  // --- NEW: DYNAMIC MENU STATE ---
  const [menuItems, setMenuItems] = useState([]);
  const [isMenuLoaded, setIsMenuLoaded] = useState(false);

  // Handle Android Hardware Back Button
  useAndroidBackButton(view, setView);

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_menu_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_menu_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeSubcategory, setActiveSubcategory] = useState('All');
  const [activeItem, setActiveItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(ANNOUNCEMENT.show);
  const [logoError, setLogoError] = useState(false);

  const [activeOrders, setActiveOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_menu_active_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // UI State
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Checkout Form State
  const [tempChangeLocation, setTempChangeLocation] = useState(null);
  const [tempChangeComponents, setTempChangeComponents] = useState(null);
  const [addressModified, setAddressModified] = useState(false);
  const [lastDeliveryInfo, setLastDeliveryInfo] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [mapLink, setMapLink] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [timingSelection, setTimingSelection] = useState('now');
  const [streetInfo, setStreetInfo] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    landmark: '',
    orderMode: 'Dine In',
    paymentMethod: 'Cash',
    time: 'ASAP',
  });

  // 2. EFFECTS

  // --- INITIALIZATION: FETCH MENU & USER ---
  useEffect(() => {
    document.title = 'Morpho App';
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = BRAND_INFO.logo;

    const fontLink = document.createElement('link');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Poppins:wght@400;700;900&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // --- FETCH MENU FROM FIREBASE ---
    const loadMenu = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'menu'));
        const fetchedItems = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            price: Number(data.price),
            variants: Array.isArray(data.variants) ? data.variants : [],
            addons: Array.isArray(data.addons) ? data.addons : [],
          };
        });

        const validItems = fetchedItems.filter((item) => {
          const avail = item.isAvailable || item.isavailable;
          return avail === true || String(avail).toUpperCase() === 'TRUE';
        });

        setMenuItems(validItems.length > 0 ? validItems : FALLBACK_MENU);
      } catch (error) {
        console.warn('Firebase Menu fetch failed, using fallback:', error);
        setMenuItems(FALLBACK_MENU);
      } finally {
        setIsMenuLoaded(true);
      }
    };

    loadMenu();

    // B. LOAD USER
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('smart_menu_user');
      const trustToken = localStorage.getItem('trust_token');

      if (savedUser && trustToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setFormData((prev) => ({
            ...prev,
            name: parsedUser.name,
            phone: parsedUser.phone,
            address: parsedUser.address,
          }));
          if (parsedUser.deliveryFee) {
            setDeliveryFee(parsedUser.deliveryFee);
            setDistanceKm(parsedUser.distanceKm);
            setMapLink(parsedUser.mapLink);
            if (parsedUser.mapLink) {
              const match = parsedUser.mapLink.match(/q=([-0-9.]+),([-0-9.]+)/);
              if (match) {
                setSelectedLocation({
                  lat: parseFloat(match[1]),
                  lng: parseFloat(match[2]),
                });
              }
            }
          }
          setView('menu');
        } catch (e) {
          setView('login');
        }
      } else {
        setView('login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // --- LOCAL STORAGE SYNC ---
  useEffect(
    () => localStorage.setItem('smart_menu_cart', JSON.stringify(cart)),
    [cart]
  );
  useEffect(
    () =>
      localStorage.setItem(
        'smart_menu_active_orders',
        JSON.stringify(activeOrders)
      ),
    [activeOrders]
  );
  useEffect(
    () =>
      localStorage.setItem('smart_menu_favorites', JSON.stringify(favorites)),
    [favorites]
  );

  // --- STATUS POLLING ---
  useEffect(() => {
    let intervalId;
    if (activeOrders.length > 0) {
      const checkAllStatuses = async () => {
        const promises = activeOrders.map(async (order) => {
          if (['delivered', 'cancelled'].includes(order.status)) return order;
          try {
            const response = await fetch(
              `${GOOGLE_SCRIPT_URL}?action=getStatus&orderId=${
                order.id
              }&_=${Date.now()}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.status) {
                const normalized = data.status
                  .toLowerCase()
                  .replace(/\s+/g, '');
                let final = normalized;
                if (normalized.includes('place')) final = 'placed';
                else if (normalized.includes('prepar')) final = 'preparing';
                else if (normalized.includes('way')) final = 'ontheway';
                else if (normalized.includes('deliver')) final = 'delivered';
                else if (normalized.includes('arrive')) final = 'arrived';

                if (order.status !== 'arrived' && final === 'arrived') {
                  playNotificationSound('rider');
                  setShowArrivedModal(true);
                }
                if (order.status !== final) return { ...order, status: final };
              }
            }
          } catch (e) {
            console.error('Polling error', e);
          }
          return order;
        });
        const updatedOrders = await Promise.all(promises);
        if (JSON.stringify(updatedOrders) !== JSON.stringify(activeOrders))
          setActiveOrders(updatedOrders);
      };
      checkAllStatuses();
      intervalId = setInterval(checkAllStatuses, 5000);
    }
    return () => clearInterval(intervalId);
  }, [activeOrders]);

  // 3. HANDLERS
  const handleLogin = (userProfile) => {
    localStorage.setItem('smart_menu_user', JSON.stringify(userProfile));
    setUser(userProfile);
    setFormData((prev) => ({
      ...prev,
      name: userProfile.name,
      phone: userProfile.phone,
      address: userProfile.address,
    }));
    if (userProfile.deliveryFee) {
      setDeliveryFee(userProfile.deliveryFee);
      setDistanceKm(userProfile.distanceKm);
      setMapLink(userProfile.mapLink);
    }
    setView('menu');
  };

  const handleToggleFavorite = (itemId) => {
    setFavorites((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDismissOrder = (orderId) => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, isDismissed: true } : o))
    );
  };

  // --- DYNAMIC FILTERING ---
  const subcategories = useMemo(() => {
    const currentItems = menuItems.length > 0 ? menuItems : FALLBACK_MENU;
    const subs = currentItems
      .filter((i) => i.category === activeCategory)
      .map((i) => i.subcategory)
      .filter(Boolean);
    const sorted = [...new Set(subs)].sort((a, b) =>
      a === 'Featured' ? -1 : b === 'Featured' ? 1 : a.localeCompare(b)
    );
    return ['All', ...sorted];
  }, [activeCategory, menuItems]);

  const filteredItems = useMemo(() => {
    const currentItems = menuItems.length > 0 ? menuItems : FALLBACK_MENU;
    if (searchQuery.trim()) {
      return currentItems.filter((i) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return currentItems.filter(
      (i) =>
        i.category === activeCategory &&
        (activeSubcategory === 'All' || i.subcategory === activeSubcategory)
    );
  }, [searchQuery, activeCategory, activeSubcategory, menuItems]);

  const getAvailableSlots = (mode, isLater) => {
    const now = new Date();
    const phHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        hour12: false,
      }).format(now)
    );
    const phMinute = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        minute: 'numeric',
      }).format(now)
    );
    const currentTotalMinutes = (phHour === 24 ? 0 : phHour) * 60 + phMinute;
    const isLate = phHour >= 22;

    // Buffer: If Later is selected, skip 30 mins for all modes
    const buffer = isLater ? 30 : 0;

    return TIME_SLOTS.filter((slot) => {
      // Allow ASAP for all modes unless 'Later' is specifically clicked
      if (slot === 'ASAP') return !isLater;

      if (isLate) return true;
      return convertToMinutes(slot) > currentTotalMinutes + buffer;
    });
  };

  const addToCart = (
    item,
    selectedAddOns,
    quantity,
    selectedVariant,
    unavailableAction
  ) => {
    const basePrice = selectedVariant ? selectedVariant.price : item.price;
    const finalPrice =
      basePrice + selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    setCart([
      ...cart,
      {
        ...item,
        uniqueId: Date.now(),
        selectedAddOns,
        selectedVariant: selectedVariant ? selectedVariant.name : null,
        unavailableAction,
        quantity,
        finalPrice,
        totalPrice: finalPrice * quantity,
      },
    ]);
  };

  const CartTotal = cart.reduce((sum, i) => sum + i.totalPrice, 0);
  const FinalTotal =
    CartTotal + (formData.orderMode === 'Delivery' ? deliveryFee : 0);

  const handleMapConfirm = (locData) => {
    if (locData.fee === -1) return alert('Location too far!');
    setTempChangeLocation(locData);
    setTempChangeComponents(locData.streetInfo || { road: '', district: '' });
    setShowMapPicker(false);
    setShowDetailsForm(true);
  };

  const handleDetailsConfirm = (houseNo, street, district) => {
    const fullAddress = `${houseNo} ${street}, ${district}, Cuyapo, Nueva Ecija`;
    const locData = tempChangeLocation;
    setDeliveryFee(locData.fee);
    setMapLink(locData.mapLink);
    setSelectedLocation({ lat: locData.lat, lng: locData.lng });
    setAddressModified(true);
    setLastDeliveryInfo({
      fee: locData.fee,
      distance: locData.distance,
      mapLink: locData.mapLink,
      coords: { lat: locData.lat, lng: locData.lng },
      streetInfo: { road: street, district },
    });
    setFormData((prev) => ({ ...prev, address: fullAddress }));
    setStreetInfo(
      typeof tempChangeLocation.streetInfo === 'string'
        ? tempChangeLocation.streetInfo
        : `${street}, ${district}`
    );
    setShowDetailsForm(false);
  };

  const handleOrderModeChange = (mode) => {
    setFormData((prev) => ({ ...prev, orderMode: mode }));

    // Delivery Logic
    if (mode === 'Delivery') {
      if (addressModified && lastDeliveryInfo) {
        setDeliveryFee(lastDeliveryInfo.fee);
        setDistanceKm(lastDeliveryInfo.distance);
        setMapLink(lastDeliveryInfo.mapLink);
        setSelectedLocation(lastDeliveryInfo.coords);
        const info = lastDeliveryInfo.streetInfo;
        setStreetInfo(
          typeof info === 'object'
            ? `${info.road}, ${info.district}`
            : info || ''
        );
      } else if (user && user.deliveryFee) {
        setDeliveryFee(user.deliveryFee);
        setDistanceKm(user.distanceKm);
        setMapLink(user.mapLink);
        if (user.mapLink) {
          const match = user.mapLink.match(/q=([-0-9.]+),([-0-9.]+)/);
          if (match)
            setSelectedLocation({
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
            });
        }
      }
    } else {
      setDeliveryFee(0);
      setShowMapPicker(false);
    }

    // Default to 'now' (ASAP) for ALL modes
    setTimingSelection('now');
    setFormData((prev) => ({ ...prev, orderMode: mode, time: 'ASAP' }));
  };

  const handlePlaceOrderClick = () => {
    if (formData.orderMode === 'Delivery' && !formData.address)
      setShowMapPicker(true);
    else setShowConfirmModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('trust_token');
    localStorage.removeItem('smart_menu_cart');
    localStorage.removeItem('smart_menu_active_orders');
    setUser(null);
    setCart([]);
    setActiveOrders([]);
    setView('login');
  };

  const submitOrder = async () => {
    setShowConfirmModal(false);
    if (!formData.name || !formData.phone || !formData.paymentMethod)
      return alert('Please fill all details');
    setLoading(true);
    const uniqueOrderId = Date.now().toString();

    const itemsStr = cart
      .map((i) => {
        const addonString = i.selectedAddOns
          .map((a) => (a.choice ? `${a.name} [${a.choice}]` : a.name))
          .join(', ');

        return `${i.quantity}x ${i.name} ${
          i.selectedVariant ? '[' + i.selectedVariant + ']' : ''
        } ${addonString ? `(${addonString})` : ''}\n   > If N/A: ${
          i.unavailableAction
        }`;
      })
      .join('\n');

    const finalPayload = {
      ...formData,
      orderId: uniqueOrderId,
      total: FinalTotal,
      items:
        itemsStr +
        (deliveryFee > 0 ? `\n\n🛵 DELIVERY FEE: ₱${deliveryFee}` : ''),
      payment: formData.paymentMethod,
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      const newOrder = {
        id: uniqueOrderId,
        total: FinalTotal,
        items: cart,
        status: 'placed',
        timestamp: new Date().toISOString(),
        customerPhone: user.phone,
      };
      setActiveOrders((prev) => [...prev, newOrder]);
      setCart([]);
      setShowStatusPopup(true);
      setView('menu');
    } catch (error) {
      console.error('Submission Error', error);
      alert('Something went wrong. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // 4. VIEW RENDERING
  if (view === 'loading' || !isMenuLoaded) {
    return (
      <>
        <NetworkStatus />
        <InAppBrowserBlocker />
        <AndroidInstallPrompt />
        <IOSInstallPrompt />
        <LoadingScreen duration={2500} />
      </>
    );
  }

  if (view === 'login')
    return (
      <>
        <NetworkStatus />
        <InAppBrowserBlocker />
        <AndroidInstallPrompt />
        <IOSInstallPrompt />
        <LoginScreen onLogin={handleLogin} />
      </>
    );

  if (view === 'profile')
    return (
      <>
        <NetworkStatus />
        <LoginScreen
          key="profile-view"
          onLogin={handleLogin}
          initialData={user}
          isEditing={true}
          onCancel={() => setView('menu')}
          orders={activeOrders}
          onLogout={handleLogout}
        />
      </>
    );

  if (view === 'item-details' && activeItem)
    return (
      <>
        <NetworkStatus />
        <ItemDetailsPage
          item={activeItem}
          onBack={() => setView('menu')}
          onAdd={(i, a, q, v, u) => {
            addToCart(i, a, q, v, u);
            setView('menu');
          }}
          setActiveCategory={setActiveCategory}
          activeCategory={activeCategory}
        />
      </>
    );

  if (view === 'favorites')
    return (
      <>
        <NetworkStatus />
        <FavoritesScreen
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onBack={() => setView('menu')}
          onItemClick={(item) => {
            setActiveItem(item);
            setView('item-details');
          }}
        />
      </>
    );

  // MAIN MENU RENDER
  return (
    <div className="min-h-[100dvh] bg-gray-50 pb-32 font-opensans text-gray-900 relative">
      <style>{`.font-poppins { font-family: 'Poppins', sans-serif; } .font-opensans { font-family: 'Open Sans', sans-serif; }`}</style>
      <NetworkStatus /> <InAppBrowserBlocker /> <AndroidInstallPrompt />{' '}
      <IOSInstallPrompt />
      {/* HEADER */}
      <div className="bg-[#013E37]/85 backdrop-blur-xl sticky top-0 z-30 shadow-lg border-b border-white/10 font-poppins pt-[env(safe-area-inset-top)]">
        <div className="px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1">
              {BRAND_INFO.logo && !logoError ? (
                <img
                  src={BRAND_INFO.logo}
                  className="w-12 h-12 object-contain filter drop-shadow-md"
                  alt="Logo"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <ChefHat size={32} className="text-[#F4F3F2]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none text-[#F4F3F2]">
                {BRAND_INFO.name}
              </span>
              {user && (
                <span className="text-xs font-semibold text-[#F4F3F2]/90 mt-0.5 font-opensans">
                  {user.name
                    ? `Hello, ${user.name.split(' ')[0]}!`
                    : 'Welcome back!'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('favorites')}
              className="p-2 transition-transform active:scale-90"
            >
              <Heart
                size={26}
                className={
                  favorites.length > 0
                    ? 'fill-[#F4F3F2] text-white'
                    : 'text-[#F4F3F2] hover:text-white'
                }
              />
            </button>
            <button
              onClick={() => setView('profile')}
              className="p-1.5 rounded-full border-2 border-[#F4F3F2]/30 hover:border-[#F4F3F2] transition-colors bg-white/5"
            >
              {user && user.profilePic ? (
                <img
                  src={user.profilePic}
                  className="w-9 h-9 rounded-full object-cover"
                  alt="Profile"
                />
              ) : (
                <div className="w-9 h-9 bg-[#F4F3F2]/10 rounded-full flex items-center justify-center text-[#F4F3F2]">
                  <User size={18} />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="px-5 pb-4">
          <div className="bg-white/20 border border-white/15 rounded-2xl flex items-center px-4 py-3 gap-3 backdrop-blur-md transition-colors hover:bg-white/15 focus-within:bg-white/20">
            <Search className="text-[#F4F3F2]/80" size={18} />
            <input
              placeholder="What are you craving today?"
              className="bg-transparent border-none outline-none text-[#F4F3F2] placeholder:text-[#F4F3F2]/50 w-full font-opensans text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full hover:bg-white/10 text-[#F4F3F2]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="flex gap-2 px-5 pb-4 overflow-x-auto no-scrollbar items-center">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setActiveCategory(c);
                setActiveSubcategory('All');
                setSearchQuery('');
              }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 font-poppins ${
                activeCategory === c && !searchQuery
                  ? 'bg-[#F4F3F2] text-[#013E37] shadow-lg transform scale-105 border-transparent'
                  : 'bg-white/10 text-[#F4F3F2] border border-white/10 hover:bg-white/20'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {!searchQuery && subcategories.length > 1 && (
          <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar -mt-1">
            {subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubcategory(sub)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors font-opensans ${
                  activeSubcategory === sub
                    ? 'bg-[#F4F3F2]/20 text-[#F4F3F2]'
                    : 'text-[#F4F3F2]/60 hover:text-[#F4F3F2]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* MENU GRID */}
      {view === 'menu' && (
        <div className="p-5 animate-fade-in">
          {searchQuery && (
            <div className="mb-4 text-gray-500 font-bold font-poppins text-sm">
              Found {filteredItems.length} results for "{searchQuery}"
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pb-20">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[1.5rem] shadow-lg shadow-gray-200/50 flex flex-col hover:shadow-xl transition-all cursor-pointer group overflow-hidden relative"
                onClick={() => {
                  setActiveItem(item);
                  setView('item-details');
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(item.id);
                  }}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                >
                  <Heart
                    size={16}
                    className={
                      favorites.includes(item.id)
                        ? 'text-[#013E37] fill-[#013E37]'
                        : 'text-black-400'
                    }
                  />
                </button>
                <div className="h-32 w-full overflow-hidden relative bg-gray-100">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt={item.name}
                  />
                  {item.variants && item.variants.length > 0 && (
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md font-poppins">
                      {item.variants.length} Options
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight text-sm mb-1 line-clamp-2 font-poppins">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-1 mb-3 font-opensans">
                    {item.description}
                  </p>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="font-bold text-[#013E37] text-lg font-poppins">
                      ₱{item.price}
                    </span>
                    <button className="bg-gray-100 text-gray-900 p-2 rounded-full hover:bg-[#013E37] hover:text-white transition-colors shadow-sm">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && searchQuery && (
            <div className="text-center py-20 text-gray-400">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-poppins font-bold">No items found</p>
            </div>
          )}
        </div>
      )}
      {/* FLOATING CART BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pointer-events-none font-poppins">
        <div className="flex gap-3 pointer-events-auto">
          {cart.length > 0 && (
            <button
              onClick={() => setView('cart')}
              className="flex-1 bg-[#013E37]/95 backdrop-blur-md text-[#F4F3F2] py-4 rounded-3xl font-bold shadow-2xl shadow-green-900/20 flex justify-between px-6 items-center ring-1 ring-white/10 animate-slideUp"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#F4F3F2]/20 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </div>
                <span className="text-sm">View Cart</span>
              </div>
              <span className="text-lg">₱{CartTotal}</span>
            </button>
          )}
          <button
            onClick={() => setShowStatusPopup(true)}
            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all relative ${
              activeOrders.length > 0
                ? 'bg-white text-gray-800'
                : 'bg-white/80 backdrop-blur text-gray-400'
            }`}
          >
            <Clock size={24} />
            {activeOrders.some(
              (o) =>
                o.status !== 'delivered' ||
                (o.status === 'delivered' && !o.isDismissed)
            ) && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            )}
          </button>
        </div>
      </div>
      {/* CHECKOUT DRAWER */}
      {(view === 'cart' || view === 'checkout') && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center font-poppins">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setView('menu')}
          />
          <div className="relative bg-white w-full max-w-md h-[90vh] rounded-t-[2.5rem] flex flex-col shadow-2xl animate-slideUp overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-black text-2xl text-gray-900">
                {view === 'cart' ? 'Your Bag' : 'Checkout'}
              </h2>
              <button
                onClick={() => setView('menu')}
                className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ChevronDown size={24} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white pb-[env(safe-area-inset-bottom)]">
              {view === 'cart' ? (
                cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
                    <ShoppingBag size={64} className="mb-4 opacity-20" />
                    <p className="font-bold">Your bag is empty</p>
                    <button
                      onClick={() => setView('menu')}
                      className="mt-4 text-[#013E37] font-bold text-sm"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.uniqueId}
                        className="flex justify-between items-start border border-gray-100 p-4 rounded-2xl bg-white shadow-sm"
                      >
                        <div>
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span className="bg-[#013E37]/10 text-[#013E37] px-2 py-0.5 rounded text-xs">
                              {item.quantity}x
                            </span>
                            {item.name}
                          </div>
                          {item.selectedVariant && (
                            <div className="text-xs font-bold text-gray-500 mt-1 pl-8">
                              • {item.selectedVariant}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 pl-8 mt-0.5 leading-relaxed font-opensans">
                            {item.selectedAddOns
                              .map((a) =>
                                a.choice ? `${a.name} [${a.choice}]` : a.name
                              )
                              .join(', ')}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-sm font-bold">
                            ₱{item.totalPrice}
                          </span>
                          <button
                            onClick={() =>
                              setCart(
                                cart.filter((c) => c.uniqueId !== item.uniqueId)
                              )
                            }
                            className="text-red-400 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* CHECKOUT VIEW */
                <div className="space-y-6">
                  <div className="bg-[#013E37]/5 p-6 rounded-3xl border border-[#013E37]/10 flex justify-between items-center">
                    <span className="text-[#013E37] font-bold">
                      Total Amount
                    </span>
                    <span className="text-3xl font-black text-[#013E37] tracking-tight">
                      ₱{FinalTotal}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Order Type
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
                      {['Dine In', 'Pick Up', 'Delivery'].map((m) => (
                        <button
                          key={m}
                          onClick={() => handleOrderModeChange(m)}
                          className={`py-3 text-xs font-bold rounded-lg transition-all ${
                            formData.orderMode === m
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      {formData.orderMode === 'Dine In'
                        ? 'Serving Time'
                        : formData.orderMode === 'Pick Up'
                        ? 'Pickup Time'
                        : 'Delivery Time'}
                    </label>

                    {/* BUTTONS: Always visible now */}
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() => {
                          setTimingSelection('now');
                          setFormData((prev) => ({ ...prev, time: 'ASAP' }));
                        }}
                        className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                          timingSelection === 'now'
                            ? 'bg-[#013E37]/5 border-[#013E37] text-[#013E37]'
                            : 'bg-white text-gray-500 border-gray-100'
                        }`}
                      >
                        <Zap size={14} />{' '}
                        {formData.orderMode === 'Delivery'
                          ? 'Deliver Now'
                          : 'Prepare Now'}
                      </button>
                      <button
                        onClick={() => {
                          setTimingSelection('later');
                          const slots = getAvailableSlots(
                            formData.orderMode,
                            true
                          );
                          setFormData((prev) => ({
                            ...prev,
                            time: slots.length > 0 ? slots[0] : 'ASAP',
                          }));
                        }}
                        className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                          timingSelection === 'later'
                            ? 'bg-[#013E37]/5 border-[#013E37] text-[#013E37]'
                            : 'bg-white text-gray-500 border-gray-100'
                        }`}
                      >
                        <Clock size={14} /> Later
                      </button>
                    </div>

                    {/* DROPDOWN: Shows only when LATER is clicked */}
                    {timingSelection === 'later' && (
                      <div className="animate-fade-in relative">
                        <select
                          className="w-full p-4 border border-gray-200 rounded-2xl bg-white text-base font-bold focus:ring-2 focus:ring-[#013E37] outline-none appearance-none"
                          value={formData.time}
                          onChange={(e) =>
                            setFormData({ ...formData, time: e.target.value })
                          }
                        >
                          {getAvailableSlots(
                            formData.orderMode,
                            timingSelection === 'later'
                          ).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                          size={16}
                        />
                      </div>
                    )}
                  </div>

                  {formData.orderMode === 'Delivery' && (
                    <div className="space-y-4 animate-fade-in pt-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                        Delivery Address
                      </label>
                      {showMapPicker ? (
                        <div className="border rounded-2xl overflow-hidden shadow-sm h-[400px] flex flex-col">
                          <LocationPicker onLocationSelect={handleMapConfirm} />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm relative group overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 group-hover:bg-[#013E37] transition-colors"></div>
                          {formData.address ? (
                            <div className="pl-2">
                              {selectedLocation && (
                                <div className="h-20 w-full rounded-xl overflow-hidden mb-3 border border-gray-100 relative pointer-events-none opacity-80">
                                  <ReadOnlyMap
                                    center={[
                                      selectedLocation.lat,
                                      selectedLocation.lng,
                                    ]}
                                  />
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 text-sm leading-snug">
                                    {formData.address}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded">
                                    {distanceKm}km • Fee: ₱{deliveryFee}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setShowMapPicker(true)}
                                className="absolute top-3 right-3 text-xs font-bold text-[#013E37] bg-[#013E37]/10 px-3 py-1.5 rounded-lg hover:bg-[#013E37]/20 transition-colors"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowMapPicker(true)}
                              className="w-full py-4 text-[#013E37] font-bold text-sm bg-[#013E37]/5 rounded-xl border border-dashed border-[#013E37]/30 hover:bg-[#013E37]/10 transition-colors flex items-center justify-center gap-2"
                            >
                              <MapPin size={18} /> Set Delivery Location
                            </button>
                          )}
                          <input
                            placeholder="Add Landmark (Optional)"
                            className="w-full mt-3 p-3 border-t border-gray-100 bg-transparent text-base focus:outline-none placeholder:text-gray-400"
                            value={formData.landmark}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                landmark: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {['Cash', 'GCash', 'Maya'].map((p) => (
                        <label
                          key={p}
                          className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${
                            formData.paymentMethod === p
                              ? 'border-[#013E37] bg-[#013E37]/5 shadow-sm'
                              : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              formData.paymentMethod === p
                                ? 'border-[#013E37]'
                                : 'border-gray-300'
                            }`}
                          >
                            {formData.paymentMethod === p && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#013E37]"></div>
                            )}
                          </div>
                          <input
                            type="radio"
                            checked={formData.paymentMethod === p}
                            onChange={() =>
                              setFormData({ ...formData, paymentMethod: p })
                            }
                            className="hidden"
                          />
                          <span className="font-bold text-gray-800">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-gray-100 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {view === 'cart' ? (
                <button
                  onClick={() => setView('checkout')}
                  disabled={cart.length === 0}
                  className="w-full bg-[#013E37] text-white py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-transform flex justify-between px-6 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Checkout</span>
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                    ₱{CartTotal}
                  </span>
                </button>
              ) : (
                <button
                  onClick={submitOrder}
                  disabled={
                    loading ||
                    (formData.orderMode === 'Delivery' &&
                      (deliveryFee <= 0 || showMapPicker))
                  }
                  className={`w-full text-white py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-[0.98] flex justify-between px-6 items-center ${
                    loading ||
                    (formData.orderMode === 'Delivery' &&
                      (deliveryFee <= 0 || showMapPicker))
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
                      : 'bg-[#013E37] shadow-[#013E37]/30'
                  }`}
                >
                  <span>{loading ? 'Processing...' : 'Place Order'}</span>
                  {!loading && (
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                      ₱{FinalTotal}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showDetailsForm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in font-poppins">
          <div className="bg-white w-full max-w-md p-6 rounded-t-[2rem] sm:rounded-3xl shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-900">
                Address Details
              </h3>
              <button
                onClick={() => setShowDetailsForm(false)}
                className="text-gray-400 bg-gray-100 p-2 rounded-full hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <AddressDetailsForm
              addressData={tempChangeComponents}
              onConfirm={handleDetailsConfirm}
            />
          </div>
        </div>
      )}
      {showPromo && <AnnouncementModal onClose={() => setShowPromo(false)} />}
      {showStatusPopup && (
        <StatusPopup
          activeOrders={activeOrders.filter(
            (o) =>
              !o.isDismissed &&
              (o.customerPhone === user.phone || !o.customerPhone)
          )}
          onDismiss={handleDismissOrder}
          onClose={() => setShowStatusPopup(false)}
        />
      )}
      {showConfirmModal && (
        <ConfirmationModal
          onConfirm={submitOrder}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {showArrivedModal && (
        <RiderArrivedModal onClose={() => setShowArrivedModal(false)} />
      )}
    </div>
  );
}
