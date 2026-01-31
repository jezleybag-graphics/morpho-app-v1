import { NOTIFICATION_SOUND_URL } from './firebase';

// ==========================================
// 1. EXISTING MAP & FEE LOGIC (Preserved)
// ==========================================

export const calculateFee = (km) => {
  if (km <= 1) return 30;
  if (km <= 2) return 60;
  if (km <= 3) return 90;
  if (km <= 4) return 120;
  if (km <= 5) return 150;
  if (km <= 6) return 180;
  if (km <= 7) return 200;
  return -1;
};

export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1)); // Fixed to 1 decimal place
};

export const getRoadDistanceKm = async (lat1, lon1, lat2, lon2) => {
  try {
    // OSRM Public Server (Demo purposes only)
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0)
      return data.routes[0].distance / 1000; // Convert meters to km
    throw new Error('No route found');
  } catch (error) {
    // Fallback to straight-line distance if OSRM fails
    return getDistanceKm(lat1, lon1, lat2, lon2);
  }
};

export const getReverseGeocoding = async (lat, lon) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.address) {
      const road = data.address.road || data.address.pedestrian || '';
      const district = data.address.neighbourhood || data.address.suburb || '';
      return { road, district };
    }
    return { road: '', district: '' };
  } catch (error) {
    return { road: '', district: '' };
  }
};

// ==========================================
// 2. TIME & DATE HELPERS
// ==========================================

export const convertToMinutes = (timeStr) => {
  if (!timeStr || timeStr === 'ASAP') return -1;
  try {
    // Handle "10:30 AM" format
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch (e) {
    return -1;
  }
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  } catch (e) {
    return '';
  }
};

// ==========================================
// 3. NEW HELPERS (For Google Sheet Integration)
// ==========================================

// Standardizes status strings (e.g. "On the Way" -> "ontheway")
export const normalizeStatus = (status) =>
  String(status || '')
    .toLowerCase()
    .replace(/\s/g, '');

// Parses the "Items" string stored in Google Sheets back into an Array
// Essential if you want to display Order History details cleanly
export const parseOrderItems = (itemsString) => {
  if (!itemsString) return [];
  const rawLines = itemsString.split('\n').filter((line) => line.trim() !== '');
  const parsedItems = [];
  let currentItem = null;

  rawLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      if (currentItem) {
        currentItem.notes = trimmed.replace('>', '').trim();
      }
    } else if (trimmed.toUpperCase().includes('DELIVERY FEE')) {
      parsedItems.push({ type: 'fee', raw: trimmed });
    } else {
      const qtyMatch = trimmed.match(/^(\d+)x\s+(.*)/);
      if (qtyMatch) {
        const qty = qtyMatch[1];
        let rest = qtyMatch[2];
        let variant = '';
        let addons = '';
        const variantMatch = rest.match(/\[(.*?)\]/);
        if (variantMatch) {
          variant = variantMatch[1];
          rest = rest.replace(/\[.*?\]/, '').trim();
        }
        const addonMatch = rest.match(/\((.*?)\)/);
        if (addonMatch) {
          addons = addonMatch[1];
          rest = rest.replace(/\(.*?\)/, '').trim();
        }
        const name = rest.trim();
        currentItem = { type: 'item', qty, name, variant, addons, notes: '' };
        parsedItems.push(currentItem);
      } else {
        parsedItems.push({ type: 'text', raw: trimmed });
      }
    }
  });
  return parsedItems;
};

// ==========================================
// 4. NOTIFICATIONS
// ==========================================

export const playNotificationSound = (type) => {
  // Uses Mixkit URLs for reliability (or your local files if they exist in /public)
  const sounds = {
    rider: 'https://assets.mixkit.co/sfx/preview/mixkit-bicycle-horn-719.mp3', // Loud for arrival
    chat: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3', // Gentle for chat
    success: 'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3'
  };

  const soundUrl = sounds[type] || sounds.success;
  const audio = new Audio(soundUrl);

  audio.play().catch((e) => console.log('Audio interaction required first:', e));

  // Haptic Feedback (Vibration)
  if (navigator.vibrate) {
    if (type === 'rider') navigator.vibrate([500, 200, 500]); // Long buzz
    else navigator.vibrate(200); // Short buzz
  }
};

// Helper to count total items from the text string
const calculateTotalItems = (itemsString) => {
  if (!itemsString) return 0;
  // Split by new line, find "Nx" at the start, and sum them up
  return itemsString.split('\n').reduce((total, line) => {
    const match = line.match(/^(\d+)x/); // Looks for number followed by 'x'
    return total + (match ? parseInt(match[1]) : 0);
  }, 0);
};