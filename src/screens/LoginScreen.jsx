import React, { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  Loader2,
  ArrowLeft,
  User,
  AlertCircle,
  ShieldCheck,
  Key,
  Camera,
  MapPin,
  Edit,
  LogOut,
  Trash2,
  History as HistoryIcon,
  Lock as LockIcon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// LOCAL IMPORTS
import { auth, db, GOOGLE_SCRIPT_URL } from '../firebase';
import { BRAND_INFO } from '../data';
import { LocationPicker } from '../components/Maps';
import { AddressDetailsForm } from '../components/Modals';
import { formatDate } from '../utils';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const LoginScreen = ({
  onLogin,
  initialData,
  onCancel,
  orders = [],
  onLogout,
}) => {
  const [authStep, setAuthStep] = useState(
    initialData ? 'EDIT_PROFILE' : 'WELCOME'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Registration Data
  const [regName, setRegName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [regPin, setRegPin] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [regSecretQ, setRegSecretQ] = useState("What is your pet's name?");
  const [regSecretA, setRegSecretA] = useState('');
  const [regProfilePic, setRegProfilePic] = useState(null);
  const [regEmail, setRegEmail] = useState('');

  // Forgot PIN state
  const [resetAnswer, setResetAnswer] = useState('');

  // Temp Location Data for multi-step Reg
  const [tempLocation, setTempLocation] = useState(null);
  const [tempAddressComponents, setTempAddressComponents] = useState(null);

  // Temp Location Data for Updating Profile
  const [tempUpdateLocation, setTempUpdateLocation] = useState(null);
  const [tempUpdateComponents, setTempUpdateComponents] = useState(null);

  const [profile, setProfile] = useState(
    initialData || {
      name: '',
      phone: '',
      address: '',
      deliveryFee: 0,
      mapLink: '',
      distanceKm: 0,
      profilePic: null,
    }
  );

  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');

  useEffect(() => {
    if (initialData) {
      setProfile(initialData);
      setAuthStep('EDIT_PROFILE');
    } else {
      const saved = localStorage.getItem('smart_menu_user');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          setFoundUser(user);
          setAuthStep('PIN');
        } catch (e) {}
      }
    }
  }, [initialData]);

  const historyOrders = Array.isArray(orders)
    ? orders
        .filter((o) => ['delivered', 'cancelled'].includes(o.status))
        .reverse()
    : [];

  const normalizePhone = (p) => {
    let cleaned = p.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('63')) cleaned = cleaned.substring(2);
    if (cleaned.length === 10) return '0' + cleaned;
    return null;
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const q = query(
        collection(db, 'users'),
        where('email', '==', user.email)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        generateTrustToken(userData);
      } else {
        setRegName(user.displayName || '');
        setRegEmail(user.email);
        setRegProfilePic(user.photoURL);
        setAuthStep('REGISTER_FORM');
      }
      // Successful login path doesn't need setLoading(false) here because component unmounts
    } catch (err) {
      console.error('Google Auth Error:', err);
      setLoading(false); // Fix: Reset loading immediately on ANY error
      
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return; // Silent return for user cancellation
      }

      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain blocked. Add "${window.location.hostname}" to Firebase Console.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google provider is not enabled in Firebase Console.');
      } else {
        setError(err.message.replace('Firebase: ', ''));
      }
    }
  };

  const checkDatabaseForUser = async (phoneInput) => {
    setLoading(true);
    setError('');
    const normalizedKey = normalizePhone(phoneInput);
    if (!normalizedKey) {
      setError('Invalid phone number format.');
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'users', normalizedKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFoundUser(docSnap.data());
        setAuthStep('PIN');
      } else {
        setError('Number not found. Please sign up first.');
      }
    } catch (e) {
      console.error(e);
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (loginPin === foundUser.pin) {
      if (foundUser.deletionRequested) {
        const cancel = confirm(
          'Account deletion is pending. Do you want to CANCEL the deletion request and log in?'
        );
        if (cancel) {
          const key = normalizePhone(foundUser.phone);
          await setDoc(
            doc(db, 'users', key),
            {
              deletionRequested: false,
              deletionScheduledAt: null,
              deletionStatus: null,
            },
            { merge: true }
          );
          foundUser.deletionRequested = false;
        }
      }
      generateTrustToken(foundUser);
    } else {
      setError('Incorrect PIN');
      setLoginPin('');
    }
  };

  const handleForgotPin = () => {
    setResetAnswer('');
    setError('');
    setAuthStep('FORGOT_PIN');
  };

  const handleVerifySecret = () => {
    if (
      resetAnswer.trim().toLowerCase() ===
      foundUser.secretA.trim().toLowerCase()
    ) {
      setLoginPin('');
      setAuthStep('RESET_PIN');
    } else {
      setError('Incorrect Answer.');
    }
  };

  const handleResetPin = async () => {
    if (loginPin.length !== 4) return;
    setLoading(true);
    try {
      const key = normalizePhone(foundUser.phone);
      await setDoc(doc(db, 'users', key), { pin: loginPin }, { merge: true });
      const updatedUser = { ...foundUser, pin: loginPin };
      setFoundUser(updatedUser);
      alert('PIN Updated! Logging you in...');
      generateTrustToken(updatedUser);
    } catch (e) {
      console.error(e);
      setError('Failed to update PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePinClick = () => {
    setLoginPin('');
    setError('');
    setAuthStep('CHANGE_PIN_OLD');
  };

  const handleVerifyOldPin = () => {
    if (loginPin === profile.pin) {
      setLoginPin('');
      setAuthStep('CHANGE_PIN_NEW');
    } else {
      setError('Incorrect PIN');
      setLoginPin('');
    }
  };

  const handleSaveChangedPin = async () => {
    if (loginPin.length !== 4) return;
    setLoading(true);
    try {
      const key = normalizePhone(profile.phone);
      await setDoc(doc(db, 'users', key), { pin: loginPin }, { merge: true });
      setProfile((prev) => ({ ...prev, pin: loginPin }));
      alert('PIN Changed Successfully!');
      setAuthStep('EDIT_PROFILE');
    } catch (e) {
      console.error(e);
      setError('Failed to save PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNext = async () => {
    if (!regName || !phone || !regPin || !regSecretA) {
      setError('Please fill all fields (Phone, Name, PIN, Secret)');
      return;
    }
    if (regPin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    const normalizedKey = normalizePhone(phone);
    if (!normalizedKey) {
      setError('Invalid phone number format. Use 10 digits.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'users', normalizedKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setError('This phone number is already linked to another account.');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error(e);
      setError('Error checking phone number.');
      setLoading(false);
      return;
    }
    setLoading(false);
    setAuthStep('REGISTER_MAP');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePinConfirm = (locData) => {
    if (locData.fee === -1) {
      alert('Location too far!');
      return;
    }
    setTempLocation(locData);
    setTempAddressComponents(locData.streetInfo || { road: '', district: '' });
    setAuthStep('REGISTER_DETAILS');
  };

  const handleDetailsComplete = async (houseNo, finalStreet, finalDistrict) => {
    const fullAddress = `${houseNo} ${finalStreet}, ${finalDistrict}, Cuyapo, Nueva Ecija`;
    const cleanPhone = normalizePhone(phone);
    const newUser = {
      name: regName,
      phone: cleanPhone,
      email: regEmail,
      pin: regPin,
      secretQ: regSecretQ,
      secretA: regSecretA,
      address: fullAddress,
      deliveryFee: tempLocation.fee,
      distanceKm: tempLocation.distance,
      mapLink: tempLocation.mapLink,
      profilePic: regProfilePic,
    };
    try {
      await setDoc(doc(db, 'users', cleanPhone), newUser);
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...newUser }),
      });
      generateTrustToken(newUser);
    } catch (e) {
      console.error('Registration Error', e);
      alert('Failed to save account. Check network.');
    }
  };

  const generateTrustToken = (userData) => {
    const token = `TRUST-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem('trust_token', token);
    onLogin(userData);
  };

  const handleSaveProfile = async () => {
    localStorage.setItem('smart_menu_user', JSON.stringify(profile));
    const key = profile.phone;
    if (key) {
      try {
        await setDoc(doc(db, 'users', key), profile, { merge: true });
      } catch (e) {
        console.error('Profile Update Error', e);
      }
    }
    onLogin(profile);
  };

  const handleAddressUpdate = (locData) => {
    if (locData.fee === -1) {
      alert('Location too far!');
      return;
    }
    setTempUpdateLocation(locData);
    setTempUpdateComponents(locData.streetInfo || { road: '', district: '' });
    setAuthStep('UPDATE_DETAILS');
  };

  const handleProfileAddressSave = (houseNo, street, district) => {
    const fullAddress = `${houseNo} ${street}, ${district}, Cuyapo, Nueva Ecija`;
    const locData = tempUpdateLocation;
    setProfile((prev) => ({
      ...prev,
      address: fullAddress,
      deliveryFee: locData.fee,
      distanceKm: locData.distance,
      mapLink: locData.mapLink,
    }));
    setAuthStep('EDIT_PROFILE');
  };

  const handleProfilePicUpdate = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, profilePic: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const performDeleteAccount = async () => {
    if (deletePin !== profile.pin) {
      setError('Incorrect PIN');
      return;
    }
    setLoading(true);
    try {
      const key = normalizePhone(profile.phone);
      if (key) {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 5);
        await setDoc(
          doc(db, 'users', key),
          {
            deletionRequested: true,
            deletionScheduledAt: scheduledDate.toISOString(),
            deletionStatus: 'pending',
          },
          { merge: true }
        );
        alert(
          `Deletion request submitted.\n\nYour account is scheduled for deletion on ${scheduledDate.toLocaleDateString()}.`
        );
      }
      localStorage.removeItem('smart_menu_user');
      localStorage.removeItem('trust_token');
      onLogout();
      setFoundUser(null);
      setAuthStep('WELCOME');
    } catch (err) {
      console.error('Delete Request Error', err);
      setError('Failed to submit request. Try again.');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeletePin('');
    }
  };

  // --- RENDER VIEWS ---

  if (authStep === 'WELCOME') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-8 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#013E37]/10 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#013E37]/20 rounded-full blur-3xl opacity-30 animate-pulse" />

        <div className="relative z-10 text-center mb-12">
          <div className="w-40 h-40 mx-auto mb-6 animate-bounce-slow flex items-center justify-center">
            <img
              src={BRAND_INFO.logo}
              alt="Brand Logo"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>

          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">
            {BRAND_INFO.name}
          </h2>
          <p className="text-gray-500 font-medium text-lg">
            "Sip the moment, one cup at a time"
          </p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto w-full relative z-10">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-gray-800 border-2 border-transparent hover:border-gray-100 py-4 rounded-2xl font-bold shadow-lg shadow-gray-100 flex justify-center items-center gap-3 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Sign in with Google
          </button>
          <button
            onClick={() => setAuthStep('PHONE_ENTRY')}
            className="w-full bg-[#013E37] text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl shadow-[#013E37]/20 flex justify-center items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <User size={20} /> Login with Phone & PIN
          </button>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm text-center flex items-center justify-center gap-2 mt-6 animate-shake">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* --- Privacy Policy Link for Google Verification --- */}
        <div className="mt-12 text-center relative z-10">
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mb-2">
            By signing in, you agree to our{' '}
            <a 
              href="/privacy.html" 
              target="_blank" 
              className="text-amber-700 underline decoration-amber-700/30 hover:text-amber-900 transition-colors"
            >
              Privacy Policy
            </a>
          </p>
          <p className="text-[10px] text-gray-400 font-bold">
            v1.0 • Developed by Morpho
          </p>
        </div>
      </div>
    );
  }

  if (authStep === 'PHONE_ENTRY') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-8 animate-fade-in">
        <div className="text-center mb-10">
          <button
            onClick={() => setAuthStep('WELCOME')}
            className="absolute top-8 left-8 p-2 rounded-full bg-white hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-20 h-20 bg-[#013E37]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#013E37]">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Phone Login</h2>
          <p className="text-gray-500">Enter your registered mobile number</p>
        </div>

        <div className="space-y-6 max-w-sm mx-auto w-full">
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-[#013E37] transition-colors">
              +63
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full pl-16 p-5 border-2 border-gray-100 rounded-2xl bg-white text-2xl font-bold tracking-widest text-gray-900 focus:border-[#013E37] outline-none transition-all placeholder:text-gray-300"
              placeholder="912 345 6789"
              maxLength="11"
              autoFocus
            />
          </div>

          <button
            onClick={() => checkDatabaseForUser(phone)}
            disabled={loading}
            className="w-full bg-[#013E37] text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl shadow-[#013E37]/20 flex justify-center items-center gap-2 active:scale-[0.98] transition-transform"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
          </button>

          {error && (
            <p className="text-red-500 text-center text-sm bg-red-50 p-3 rounded-xl">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (authStep === 'FORGOT_PIN') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-8 animate-fade-in">
        <div className="mb-8">
          <button
            onClick={() => {
              setAuthStep('PIN');
              setError('');
            }}
            className="text-gray-400 flex items-center gap-2 text-sm font-bold mb-6 hover:text-gray-600"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Security Check
          </h2>
          <p className="text-gray-500">
            Answer your security question to reset your PIN.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">
              Question
            </p>
            <p className="font-bold text-xl text-amber-900 leading-snug">
              {foundUser.secretQ}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-2 block">
              Your Answer
            </label>
            <input
              className="w-full p-5 border-2 border-gray-100 rounded-2xl bg-white font-bold text-lg focus:border-gray-900 outline-none transition-all"
              placeholder="Type answer here..."
              value={resetAnswer}
              onChange={(e) => setResetAnswer(e.target.value)}
            />
          </div>

          <button
            onClick={handleVerifySecret}
            className="w-full bg-gray-900 text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl mt-4 active:scale-[0.98] transition-transform"
          >
            Verify Answer
          </button>

          {error && (
            <p className="text-red-500 text-center text-sm mt-4 bg-red-50 p-3 rounded-xl">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (authStep === 'RESET_PIN') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-6 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#013E37]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#013E37]">
            <Key size={30} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create New PIN</h2>
          <p className="text-gray-500 text-sm mt-1">
            Enter your new 4-digit PIN
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-16 border-2 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all ${
                loginPin[i]
                  ? 'border-[#013E37] bg-[#013E37]/10 text-[#013E37] shadow-sm scale-110'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {loginPin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => setLoginPin((prev) => (prev + n).slice(0, 4))}
              className="py-4 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform"
            >
              {n}
            </button>
          ))}
          <div className="py-4"></div>
          <button
            onClick={() => setLoginPin((prev) => (prev + 0).slice(0, 4))}
            className="py-4 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={() => setLoginPin((prev) => prev.slice(0, -1))}
            className="py-4 rounded-2xl text-gray-400 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <button
          onClick={handleResetPin}
          disabled={loginPin.length !== 4 || loading}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] ${
            loginPin.length === 4
              ? 'bg-[#013E37] text-[#F4F3F2] shadow-[#013E37]/20'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {loading ? 'Saving...' : 'Save & Login'}
        </button>
        {error && (
          <p className="text-red-500 text-center text-sm mt-4">{error}</p>
        )}
      </div>
    );
  }

  if (authStep === 'REGISTER_FORM') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col p-6 animate-fade-in">
        <div className="mb-6">
          <button
            onClick={() => setAuthStep('WELCOME')}
            className="text-gray-400 flex items-center gap-1 text-sm font-bold mb-4"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <h2 className="text-3xl font-bold text-gray-900">
            {regEmail ? 'Complete Profile' : 'Guest Details'}
          </h2>
          <p className="text-gray-500 text-sm">
            We need this info for delivery contact.
          </p>
        </div>

        <div className="space-y-5 flex-1 overflow-y-auto pb-4">
          <div className="flex flex-col items-center mb-4">
            <label className="relative cursor-pointer group">
              <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl group-hover:bg-gray-300 transition-colors">
                {regProfilePic ? (
                  <img
                    src={regProfilePic}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <User size={48} className="text-gray-400" />
                )}
              </div>
              <div className="absolute bottom-1 right-1 bg-[#013E37] p-2.5 rounded-full text-white shadow-md border-2 border-white">
                <Camera size={16} />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-[#013E37] mt-2 font-bold uppercase tracking-wide">
              Upload Photo
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
              Full Name
            </label>
            <input
              className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-bold text-lg focus:border-[#013E37] outline-none transition-colors"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
              Mobile Number (Required)
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                +63
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^0-9]/g, ''))
                }
                className="w-full pl-16 p-4 border border-gray-200 rounded-2xl bg-white font-bold tracking-widest text-lg text-gray-900 focus:border-[#013E37] outline-none transition-colors"
                placeholder="912 345 6789"
                maxLength="10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 flex items-center gap-1">
              Create 4-Digit PIN <LockIcon size={12} />
            </label>
            <input
              className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-bold tracking-[1em] text-center text-xl focus:border-[#013E37] outline-none transition-colors"
              type="tel"
              maxLength="4"
              value={regPin}
              onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
            />
          </div>

          <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
            <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-sm uppercase tracking-wide">
              <Key size={16} /> Security Question
            </div>
            <select
              className="w-full p-3 border border-amber-200 rounded-xl bg-white text-base mb-3 outline-none font-medium"
              value={regSecretQ}
              onChange={(e) => setRegSecretQ(e.target.value)}
            >
              <option>What is your pet's name?</option>
              <option>What is your mother's maiden name?</option>
              <option>What was your first school?</option>
            </select>
            <input
              className="w-full p-3 border border-amber-200 rounded-xl bg-white text-base outline-none font-bold placeholder:font-normal"
              value={regSecretA}
              onChange={(e) => setRegSecretA(e.target.value)}
              placeholder="Your Secret Answer"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 bg-[#F4F3F2]">
          {error && (
            <p className="text-red-500 text-center text-sm mb-3 font-medium bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}
          <button
            onClick={handleRegisterNext}
            className="w-full bg-gray-900 text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-transform"
          >
            Next: Set Location
          </button>
        </div>
      </div>
    );
  }

  if (authStep === 'PIN') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-6 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full mx-auto mb-6 shadow-xl border-4 border-white overflow-hidden relative">
            {foundUser.profilePic ? (
              <img
                src={foundUser.profilePic}
                className="w-full h-full object-cover"
                alt="Profile"
              />
            ) : (
              <div className="w-full h-full bg-[#013E37]/10 flex items-center justify-center text-[#013E37]">
                <User size={40} />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {foundUser.name.split(' ')[0]}!
          </h2>
          <p className="text-gray-500 text-sm mt-1">Enter your 4-digit PIN</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-16 border-2 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all ${
                loginPin[i]
                  ? 'border-[#013E37] bg-[#013E37]/10 text-[#013E37] shadow-sm scale-110'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {loginPin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-end pb-8">
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => setLoginPin((prev) => (prev + n).slice(0, 4))}
                className="py-3.5 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform text-gray-800"
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => {
                setFoundUser(null);
                setAuthStep('WELCOME');
                localStorage.removeItem('smart_menu_user');
              }}
              className="py-3.5 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-wider leading-tight flex items-center justify-center hover:bg-red-50"
            >
              Switch
              <br />
              Account
            </button>

            <button
              onClick={() => setLoginPin((prev) => (prev + 0).slice(0, 4))}
              className="py-3.5 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform text-gray-800"
            >
              0
            </button>

            <button
              onClick={() => setLoginPin((prev) => prev.slice(0, -1))}
              className="py-3.5 rounded-2xl text-gray-400 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform"
            >
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>

        <button
          onClick={handleVerifyPin}
          disabled={loginPin.length !== 4}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] ${
            loginPin.length === 4
              ? 'bg-[#013E37] text-[#F4F3F2] shadow-[#013E37]/20'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          Login
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={handleForgotPin}
            className="text-[#013E37] text-xs font-bold hover:underline"
          >
            Forgot PIN?
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm mt-4 animate-bounce font-medium bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (authStep === 'REGISTER_MAP') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col p-6 animate-fade-in">
        <div className="mb-4 shrink-0">
          <button
            onClick={() => setAuthStep('REGISTER_FORM')}
            className="text-gray-400 flex items-center gap-1 text-sm font-bold mb-4"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Set Location</h2>
          <p className="text-gray-500 text-sm">
            Where should we deliver your orders?
          </p>
        </div>
        <div className="flex-1 flex flex-col">
          <LocationPicker onLocationSelect={handlePinConfirm} />
        </div>
      </div>
    );
  }

  if (authStep === 'REGISTER_DETAILS') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col p-6 animate-fade-in">
        <div className="mb-4">
          <button
            onClick={() => setAuthStep('REGISTER_MAP')}
            className="text-gray-400 flex items-center gap-1 text-sm font-bold mb-4"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Address Details</h2>
          <p className="text-gray-500 text-sm">
            Help the rider find your exact door.
          </p>
        </div>

        <div className="flex-1">
          <AddressDetailsForm
            addressData={tempAddressComponents}
            onConfirm={handleDetailsComplete}
          />
        </div>
      </div>
    );
  }

  if (authStep === 'UPDATE_LOCATION') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col p-6 animate-fade-in">
        <div className="mb-4 shrink-0">
          <button
            onClick={() => setAuthStep('EDIT_PROFILE')}
            className="text-gray-400 flex items-center gap-1 text-sm font-bold mb-4"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Update Location</h2>
          <p className="text-gray-500 text-sm">
            Pin your new delivery address.
          </p>
        </div>
        <div className="flex-1 flex flex-col">
          <LocationPicker onLocationSelect={handleAddressUpdate} />
        </div>
      </div>
    );
  }

  if (authStep === 'UPDATE_DETAILS') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col p-6 animate-fade-in">
        <div className="mb-4">
          <button
            onClick={() => setAuthStep('UPDATE_LOCATION')}
            className="text-gray-400 flex items-center gap-1 text-sm font-bold mb-4"
          >
            <ArrowLeft size={16} /> BACK
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Address Details</h2>
          <p className="text-gray-500 text-sm">
            Help the rider find your exact door.
          </p>
        </div>
        <div className="flex-1">
          <AddressDetailsForm
            addressData={tempUpdateComponents}
            onConfirm={handleProfileAddressSave}
          />
        </div>
      </div>
    );
  }

  if (authStep === 'CHANGE_PIN_OLD') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-6 animate-fade-in">
        <div className="text-center mb-6 relative">
          <button
            onClick={() => {
              setAuthStep('EDIT_PROFILE');
              setLoginPin('');
              setError('');
            }}
            className="absolute top-0 left-0 p-2 rounded-full bg-white hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="w-20 h-20 bg-[#013E37]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#013E37] border border-[#013E37]/20 mt-8">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Security Check</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your CURRENT PIN</p>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-16 border-2 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all ${
                loginPin[i]
                  ? 'border-[#013E37] bg-[#013E37]/10 text-[#013E37] shadow-sm scale-110'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {loginPin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-end pb-4">
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => setLoginPin((prev) => (prev + n).slice(0, 4))}
                className="py-3.5 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform text-gray-800"
              >
                {n}
              </button>
            ))}
            <div className="py-3.5"></div>
            <button
              onClick={() => setLoginPin((prev) => (prev + 0).slice(0, 4))}
              className="py-3.5 rounded-2xl bg-white font-bold text-2xl hover:bg-gray-100 active:scale-95 transition-transform text-gray-800"
            >
              0
            </button>
            <button
              onClick={() => setLoginPin((prev) => prev.slice(0, -1))}
              className="py-3.5 rounded-2xl text-gray-400 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform"
            >
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>

        <button
          onClick={handleVerifyOldPin}
          disabled={loginPin.length !== 4}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] ${
            loginPin.length === 4
              ? 'bg-[#013E37] text-[#F4F3F2] shadow-[#013E37]/20'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          Continue
        </button>

        {error && (
          <p className="text-red-500 text-center text-sm mt-4 animate-bounce font-medium bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (authStep === 'CHANGE_PIN_NEW') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] flex flex-col justify-center p-6 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#013E37]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#013E37] border border-[#013E37]/20">
            <Key size={30} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Set New PIN</h2>
          <p className="text-gray-500 text-sm mt-1">Enter a new 4-digit PIN</p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold ${
                loginPin[i]
                  ? 'border-[#013E37] bg-[#013E37]/10 text-[#013E37]'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {loginPin[i] ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => setLoginPin((prev) => (prev + n).slice(0, 4))}
              className="py-4 rounded-xl bg-white font-bold text-xl hover:bg-gray-100 active:scale-95 transition-transform"
            >
              {n}
            </button>
          ))}
          <div className="py-4"></div>
          <button
            onClick={() => setLoginPin((prev) => (prev + 0).slice(0, 4))}
            className="py-4 rounded-xl bg-white font-bold text-xl hover:bg-gray-100 active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={() => setLoginPin((prev) => prev.slice(0, -1))}
            className="py-4 rounded-xl text-gray-500 flex items-center justify-center hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <button
          onClick={handleSaveChangedPin}
          disabled={loginPin.length !== 4 || loading}
          className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
            loginPin.length === 4
              ? 'bg-[#013E37] text-[#F4F3F2]'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {loading ? 'Updating...' : 'Update PIN'}
        </button>

        {error && (
          <p className="text-red-500 text-center text-sm mt-4">{error}</p>
        )}
      </div>
    );
  }

  if (authStep === 'EDIT_PROFILE') {
    if (!profile)
      return (
        <div className="flex items-center justify-center min-h-[100dvh] bg-[#F4F3F2] text-gray-400">
          <Loader2 className="animate-spin text-[#013E37] w-10 h-10" />
        </div>
      );

    return (
      <div className="min-h-[100dvh] bg-[#F4F3F2] p-6 flex flex-col text-gray-900 animate-fade-in pb-32">
        <div className="text-center mb-8 relative">
          <button
            onClick={onCancel}
            className="absolute top-0 left-0 p-2 rounded-full bg-white hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="relative inline-block mx-auto mb-6 mt-4">
            <label className="relative cursor-pointer group block">
              <div className="w-28 h-28 bg-[#013E37]/10 rounded-full border-4 border-white shadow-xl overflow-hidden">
                {profile.profilePic ? (
                  <img
                    src={profile.profilePic}
                    className="w-full h-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={40} className="text-[#013E37]" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-1 right-1 bg-gray-900 p-2 rounded-full text-white shadow-md border-2 border-white z-20">
                <Camera size={14} />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePicUpdate}
                className="hidden"
              />
            </label>
            <div className="absolute top-1 right-1 bg-[#013E37] text-white p-1 rounded-full border-2 border-white z-20">
              <ShieldCheck size={14} />
            </div>
          </div>

          <h1 className="text-2xl font-black text-gray-900">{profile.name}</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {profile.phone || profile.email}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
              Edit Name
            </label>
            <input
              className="w-full p-4 border border-gray-200 rounded-2xl bg-white font-bold text-lg outline-none focus:border-[#013E37] transition-colors"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">
              Delivery Address
            </label>
            <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#013E37]"></div>
              <p className="font-bold text-gray-800 text-sm leading-relaxed flex items-start gap-3 pl-2">
                <MapPin size={18} className="mt-0.5 shrink-0 text-[#013E37]" />
                {profile.address || 'No address set'}
              </p>
              {profile.mapLink && (
                <p className="text-[10px] text-gray-400 pl-9 mt-1 truncate">
                  {profile.mapLink}
                </p>
              )}
              <button
                onClick={() => setAuthStep('UPDATE_LOCATION')}
                className="mt-4 ml-8 text-xs font-bold bg-[#013E37]/10 text-[#013E37] px-3 py-1.5 rounded-lg hover:bg-[#013E37]/20 transition-colors inline-flex items-center gap-1"
              >
                <Edit size={12} /> Update Address
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full bg-gray-900 text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-transform"
          >
            Save Changes
          </button>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleChangePinClick}
              className="w-full text-gray-600 py-4 hover:bg-gray-50 border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"
            >
              <LockIcon size={16} /> Change PIN
            </button>
            <button
              onClick={() => {
                signOut(auth);
                onLogout();
              }}
              className="w-full bg-red-50 text-red-500 py-4 rounded-2xl font-bold border border-red-100 flex items-center justify-center gap-2 text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>

          <button
            onClick={() => {
              setError('');
              setDeletePin('');
              setShowDeleteModal(true);
            }}
            className="w-full text-red-400 text-xs font-bold py-3 flex items-center justify-center gap-1 hover:text-red-600"
          >
            <Trash2 size={12} /> Delete My Account
          </button>

          <div className="mt-8 border-t border-gray-200 pt-6 w-full text-left">
            <div
              className="flex justify-between items-center mb-4 cursor-pointer p-4 hover:bg-gray-50 rounded-2xl transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              <h3 className="font-bold text-lg flex items-center gap-3">
                <div className="bg-[#013E37]/10 text-[#013E37] p-2 rounded-xl">
                  <HistoryIcon size={20} />
                </div>
                Order History
              </h3>
              {showHistory ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </div>
            {showHistory && (
              <div className="animate-fade-in space-y-3 px-2">
                {historyOrders.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No completed orders yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {historyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-gray-300">
                              #{String(order.id).slice(-4)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {formatDate(order.timestamp)}
                            </span>
                          </div>
                          <span className="font-bold text-gray-800 text-sm block">
                            {order.items.length} Items
                          </span>
                        </div>
                        <span className="font-bold text-sm text-[#013E37] bg-[#013E37]/10 px-2 py-1 rounded-lg">
                          ₱{order.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showDeleteModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Request Account Deletion
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                This will permanently remove your account and data after review.
              </p>
              <p className="text-[#013E37] text-xs font-bold mb-6">
                You can cancel this request anytime before deletion.
              </p>
              <input
                type="tel"
                maxLength="4"
                autoFocus
                value={deletePin}
                onChange={(e) =>
                  setDeletePin(e.target.value.replace(/[^0-9]/g, ''))
                }
                className="w-full p-4 border border-gray-200 rounded-2xl bg-gray-50 text-center text-2xl font-bold tracking-widest mb-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter PIN"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performDeleteAccount}
                  disabled={deletePin.length !== 4 || loading}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#F4F3F2] text-gray-400">
      <Loader2 className="animate-spin text-[#013E37]" />
    </div>
  );
};

export default LoginScreen;