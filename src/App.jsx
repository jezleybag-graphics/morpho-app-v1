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
import Cart from './screens/Cart';
import SuccessScreen from './screens/SuccessScreen'; 

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

  // --- NEW: CART STATE ---
  const [isCartOpen, setIsCartOpen] = useState(false);

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
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  
  const [showMapPicker, setShowMapPicker] = useState(false); 
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Checkout Form State (Needed for restoring session)
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
    // --- STEP 2 UPDATE: CHECK FOR SUCCESS URL ---
    if (window.location.pathname === '/success') {
      setView('success');
      // We continue to load user/menu in background so when they go back, data is ready
    }

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

    // B. LOAD USER (FIXED: Respects Success Page)
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('smart_menu_user');
      const trustToken = localStorage.getItem('trust_token');
      const isSuccessPage = window.location.pathname === '/success';

      if (savedUser && trustToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);

          // Restore Profile Data so app is ready when they leave success screen
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
          }

          // Only switch to menu if we are NOT on the success page
          if (!isSuccessPage) {
            setView('menu');
          }
        } catch (e) {
          // Guard: Don't redirect to login if we are processing a payment success
          if (!isSuccessPage) setView('login');
        }
      } else {
        // Guard: Don't redirect to login if we are processing a payment success
        if (!isSuccessPage) setView('login');
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

  // --- STATUS POLLING (CLOUD SYNC) ---
  useEffect(() => {
    let intervalId;

    // Only poll if a user is logged in
    if (user && user.phone) {
      const syncOrders = async () => {
        try {
          // 1. Ask Cloud for ALL active orders for this phone number
          const response = await fetch(
            `${GOOGLE_SCRIPT_URL}?action=getCustomerActiveOrders&phone=${user.phone}&_=${Date.now()}`
          );

          if (response.ok) {
            const data = await response.json();
            
            if (data.orders) {
              setActiveOrders((prevLocalOrders) => {
                const serverOrders = data.orders;
                
                // Map server data to our local format
                const mergedOrders = serverOrders.map(serverOrder => {
                  const localMatch = prevLocalOrders.find(local => local.id === serverOrder.id);
                  
                  // --- PRESERVED LOGIC: STATUS NORMALIZATION ---
                  // We must clean the text from Google Sheet to match your App's CSS keys
                  const rawStatus = serverOrder.status || '';
                  const normalized = rawStatus.toLowerCase().replace(/\s+/g, '');
                  let finalStatus = normalized;
                  
                  if (normalized.includes('place')) finalStatus = 'placed';
                  else if (normalized.includes('prepar')) finalStatus = 'preparing';
                  else if (normalized.includes('way')) finalStatus = 'ontheway';
                  else if (normalized.includes('deliver')) finalStatus = 'delivered';
                  else if (normalized.includes('arrive')) finalStatus = 'arrived';
                  else if (normalized.includes('cancel')) finalStatus = 'cancelled'; 
                  else if (normalized.includes('decline')) finalStatus = 'cancelled';

                  // --- PRESERVED LOGIC: NOTIFICATIONS ---
                  // Only play sound if status CHANGED to 'arrived'
                  if (localMatch && localMatch.status !== 'arrived' && finalStatus === 'arrived') {
                     playNotificationSound('rider');
                     setShowArrivedModal(true);
                  }

                  return {
                    ...serverOrder,
                    status: finalStatus, // Use the clean status
                    // Keep detailed info (like full item list) from local memory if we have it
                    // This ensures the receipt looks good on the device that placed the order
                    items: localMatch?.items?.length ? localMatch.items : [], 
                    itemsSummary: localMatch?.itemsSummary || serverOrder.itemsSummary
                  };
                });

                // Optimization: Only update React state if something actually changed
                if (JSON.stringify(mergedOrders) !== JSON.stringify(prevLocalOrders)) {
                    return mergedOrders;
                }
                return prevLocalOrders;
              });
            }
          }
        } catch (e) {
          console.error('Sync error', e);
        }
      };

      // Run immediately on load, then every 5 seconds
      syncOrders();
      intervalId = setInterval(syncOrders, 5000);
    }

    return () => clearInterval(intervalId);
  }, [user]); // Dependency is 'user', not 'activeOrders', so it works on new devices

  // 3. HANDLERS
  const handleLogin = (userProfile) => {
    localStorage.setItem('smart_menu_user', JSON.stringify(userProfile));
    setUser(userProfile);
    // Restore data
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

  const handleLogout = () => {
    localStorage.removeItem('trust_token');
    localStorage.removeItem('smart_menu_cart');
    localStorage.removeItem('smart_menu_active_orders');
    setUser(null);
    setCart([]);
    setActiveOrders([]);
    setView('login');
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

  // --- STEP 2 UPDATE: SUCCESS VIEW RENDER ---
  if (view === 'success') {
    return (
      <SuccessScreen 
        onNavigateHome={() => {
          // Clean URL bar so if they refresh they don't trigger payment logic again
          window.history.replaceState({}, document.title, "/");
          setView('menu');
        }} 
      />
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
              onClick={() => setIsCartOpen(true)}
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
      
      {/* --- NEW CART COMPONENT OVERLAY --- */}
      {isCartOpen && (
        <Cart
          cartItems={cart}
          userProfile={user}
          onClose={() => setIsCartOpen(false)}
          onRemoveItem={(index) => {
            const newCart = [...cart];
            newCart.splice(index, 1);
            setCart(newCart);
          }}
          // UPDATED: Use "Functional Update" to prevent losing the order
          onSuccess={(newOrder) => {
            console.log("Processing Successful Order:", newOrder);

            // 1. Safe State Update (prev => ...)
            setActiveOrders((prevOrders) => {
              // Create the new list based on the LATEST state
              const updated = [...prevOrders, newOrder];
              
              // Save to Storage immediately using this correct list
              localStorage.setItem('smart_menu_active_orders', JSON.stringify(updated));
              
              return updated;
            });
            
            // 2. Clear Cart
            setCart([]);
            localStorage.removeItem('smart_menu_cart');
            
            // 3. Close Modal and Show Success View
            setIsCartOpen(false);
            setView('success');
          }}
        />
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
      {showArrivedModal && (
        <RiderArrivedModal onClose={() => setShowArrivedModal(false)} />
      )}
    </div>
  );
}