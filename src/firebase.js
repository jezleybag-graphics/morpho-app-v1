import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
// We are hardcoding these temporarily to fix the "Invalid API Key" error.
const firebaseConfig = {
  apiKey: 'AIzaSyCvZWA51Q-aIaToT90ggTiEITpMem92xMo',
  authDomain: 'morpho-order-app-a8052.firebaseapp.com',
  projectId: 'morpho-order-app-a8052',
  storageBucket: 'morpho-order-app-a8052.firebasestorage.app',
  messagingSenderId: '406200852179',
  appId: '1:406200852179:web:9ab7356f003391eded3e26',
};

// ==========================================
// 2. INITIALIZE SERVICES
// ==========================================
// Initialize the App
const app = initializeApp(firebaseConfig);

// Initialize Auth (This was causing the crash before)
export const auth = getAuth(app);

// Initialize Database
export const db = getFirestore(app);

// ==========================================
// 3. GLOBAL CONSTANTS
// ==========================================

// Google Script for Orders
// Note: Ensure this URL matches exactly what you have in your Admin App
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzr_DVTJ-jeqU9uGRPEXdfXuxnru1Zgig4ngWD5WWLojSTGwCG-zPPi0oUA13ToHEzv/exec';

// Payment & UI Constants
export const MAGPIE_PUBLIC_KEY =
  import.meta.env.VITE_MAGPIE_PUBLIC_KEY || 'pk_test_...'; // Fallback if env missing
export const NOTIFICATION_SOUND_URL =
  'https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3';
