/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useSpeech, useAccessibleButton, parseSpokenNumber, LANGUAGE_CONFIG } from './hooks/useSpeech';
// In a production app, this would call our custom backend, not Gemini directly.
import { analyzeScene } from './services/gemini';
import { Search, Eye, Map as MapIcon, Languages, Mic, Banknote, ArrowLeft, Shield, HeartPulse, PhoneCall, Save, Edit2, Bell, QrCode, Trash2, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { t } from './translations';
import { useGeofencing } from './hooks/useGeofencing';

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'];

const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = ['/images/banner/banner1.png', '/images/banner/banner2.png', '/images/banner/banner3.png'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[4/3] bg-transparent overflow-hidden mb-4 mt-4 shadow-sm">
      <AnimatePresence>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-contain"
          alt={`Banner ${currentIndex + 1}`}
        />
      </AnimatePresence>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 z-10 pb-2">
        {images.map((_, idx) => (
          <div key={idx} className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? 'bg-[#1E88E5] w-6' : 'bg-[#1E88E5]/30 w-2'}`} />
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const { videoRef, isReady: cameraReady, error: cameraError, captureImage, stream } = useCamera();
  const { speak, listen, speakAndListen, stopSpeaking, stopListening, isListening, isSpeaking } = useSpeech();

  const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('appLanguage') || 'English');
  const [status, setStatus] = useState(t('status_ready', currentLanguage));
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const isDarkMode = false; // Add toggle later if needed

  useEffect(() => {
    if (currentPage === 'home') {
      setStatus(t('status_ready', currentLanguage));
    }
  }, [currentPage, currentLanguage]);

  // Feature specific states
  const [destination, setDestination] = useState(() => localStorage.getItem('destination') || '');
  const [destCoords, setDestCoords] = useState<{ lat: number, lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('destCoords');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [targetObject, setTargetObject] = useState('');

  // Emergency feature states
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    name: 'John Doe',
    age: '35',
    bloodType: 'O+',
    contactName: 'Jane Doe',
    contactPhone: '+919876543210' // Must be E.164 format for WhatsApp
  });

  // Notify feature states
  const [notifyNumbers, setNotifyNumbers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('notifyNumbers');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newNumber, setNewNumber] = useState('');
  const [notifyName, setNotifyName] = useState(() => localStorage.getItem('notifyName') || '');
  const [sandboxCode, setSandboxCode] = useState(() => localStorage.getItem('sandboxCode') || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    try {
      const saved = localStorage.getItem('mapCenter');
      return saved ? JSON.parse(saved) : [19.0760, 72.8777];
    } catch { return [19.0760, 72.8777]; }
  });
  const [isLocationSaved, setIsLocationSaved] = useState(() => localStorage.getItem('isLocationSaved') === 'true');

  const handleSearchLocation = async () => {
    if (!searchQuery.trim() || isLocationSaved) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setDestCoords({ lat, lng: lon });
        setMapCenter([lat, lon]);
        setDestination(data[0].display_name.split(',')[0]);
        speak("Location found. Please save to activate tracking.");
      } else {
        speak("Location not found.");
      }
    } catch (e) {
      speak("Error searching location.");
    }
  };

  // Persist Notify Details
  useEffect(() => {
    localStorage.setItem('notifyNumbers', JSON.stringify(notifyNumbers));
  }, [notifyNumbers]);

  useEffect(() => {
    localStorage.setItem('notifyName', notifyName);
  }, [notifyName]);

  useEffect(() => {
    localStorage.setItem('sandboxCode', sandboxCode);
  }, [sandboxCode]);

  useEffect(() => {
    localStorage.setItem('destination', destination);
  }, [destination]);

  useEffect(() => {
    localStorage.setItem('destCoords', JSON.stringify(destCoords));
  }, [destCoords]);

  useEffect(() => {
    localStorage.setItem('mapCenter', JSON.stringify(mapCenter));
  }, [mapCenter]);

  useEffect(() => {
    localStorage.setItem('isLocationSaved', isLocationSaved.toString());
  }, [isLocationSaved]);

  // Geofencing integration
  const { currentDistance, hasReached } = useGeofencing({
    destinationLat: destCoords?.lat ?? 0,
    destinationLng: destCoords?.lng ?? 0,
    destinationName: destination || 'Custom Location',
    userName: notifyName, // Use the new Notify Name for location updates
    notifyNumbers: notifyNumbers.length > 0 ? notifyNumbers : [emergencyData.contactPhone], // Fallback to emergency contact if empty
    enabled: isLocationSaved && destCoords !== null
  });

  // Welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(t('welcome_message', currentLanguage));
    }, 1000);
    return () => clearTimeout(timer);
  }, [speak, currentLanguage]);

  // --- Page Lifecycle & Voice Prompts ---
  useEffect(() => {
    let isActive = true;

    const runPageLogic = async () => {
      if (currentPage === 'navigate') {
        setDestination('');
        try {
          const dest = await speakAndListen(t('nav_prompt', currentLanguage), 3);
          if (isActive && dest) {
            setDestination(dest);
            await speak(t('nav_confirm', currentLanguage));
            handleNavigate(dest);
          }
        } catch (e) {
          if (isActive) {
            await speak(t('nav_fail', currentLanguage));
            setCurrentPage('home');
          }
        }
      } else if (currentPage === 'find') {
        setTargetObject('');
        try {
          const obj = await speakAndListen(t('find_prompt', currentLanguage), 2);
          if (isActive && obj) {
            setTargetObject(obj);
            await speak(obj + ". " + t('find_confirm', currentLanguage));
            handleFindObject(obj);
          }
        } catch (e) {
          if (isActive) {
            await speak(t('find_fail', currentLanguage));
            setCurrentPage('home');
          }
        }
      } else if (currentPage === 'language') {
        try {
          // Play single instruction prompt once
          await speak(t('lang_prompt_visual', currentLanguage));

          let isActiveSelection = true;
          // Start open listening loop for language names
          while (isActiveSelection && isActive) {
            const ans = await listen(3); // Wait for open mic
            if (!ans) continue;

            const ansLower = ans.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
            const words = ansLower.split(/\s+/);
            console.log("Language spoken input:", ansLower);

            let newLang = '';
            // Checking against 11 supported languages and cancel
            if (words.some(w => ['hindi', 'हिंदी'].includes(w))) newLang = 'Hindi';
            else if (words.some(w => ['marathi', 'मराठी'].includes(w))) newLang = 'Marathi';
            else if (words.some(w => ['english', 'अंग्रेज़ी', 'इंग्रजी'].includes(w))) newLang = 'English';
            else if (words.some(w => ['tamil', 'தமிழ்'].includes(w))) newLang = 'Tamil';
            else if (words.some(w => ['telugu', 'తెలుగు'].includes(w))) newLang = 'Telugu';
            else if (words.some(w => ['bengali', 'বাংলা', 'bangla'].includes(w))) newLang = 'Bengali';
            else if (words.some(w => ['gujarati', 'ગુજરાતી'].includes(w))) newLang = 'Gujarati';
            else if (words.some(w => ['kannada', 'ಕನ್ನಡ'].includes(w))) newLang = 'Kannada';
            else if (words.some(w => ['malayalam', 'മലയാളം'].includes(w))) newLang = 'Malayalam';
            else if (words.some(w => ['punjabi', 'ਪੰਜਾਬੀ'].includes(w))) newLang = 'Punjabi';
            else if (words.some(w => ['odia', 'ଓଡ଼ିଆ', 'oriya'].includes(w))) newLang = 'Odia';
            else if (words.some(w => ['assamese', 'অসমীয়া', 'asamiya'].includes(w))) newLang = 'Assamese';
            else if (words.some(w => ['manipuri', 'মৈতৈ', 'meitei'].includes(w))) newLang = 'Manipuri';
            else if (words.some(w => ['bodo', 'बर'].includes(w))) newLang = 'Bodo';
            else if (words.some(w => ['cancel', 'stop', 'rad', 'रद्द'].includes(w))) {
              await speak(t('lang_cancelled', currentLanguage));
              setCurrentPage('home');
              isActiveSelection = false;
              break;
            }

            if (newLang) {
              console.log("Language successfully matched to:", newLang);
              setCurrentLanguage(newLang);
              localStorage.setItem('appLanguage', newLang);

              stopListening();

              const confirmText = LANGUAGE_CONFIG[newLang as keyof typeof LANGUAGE_CONFIG]?.confirmText || `Language changed to ${newLang}`;
              await new Promise(r => setTimeout(r, 600));
              await speak(confirmText);

              setCurrentPage('home');
              isActiveSelection = false;
              break;
            } else {
              await speak(t('lang_invalid', currentLanguage));
            }
          }
        } catch (e) {
          if (isActive) setCurrentPage('home');
        }
      } else if (currentPage === 'describe') {
        await speak(t('desc_start', currentLanguage));
        handleDescribeScene();
      } else if (currentPage === 'currency') {
        await speak(t('currency_start', currentLanguage));
        handleIdentifyCurrency();
      } else if (currentPage === 'notify') {
        // Guide user based on their language
        const p1 = t('btn_notify', currentLanguage) || "Notify Area";
        const p2 = currentLanguage === 'English' ? ". Please type receiver details and pick a destination." : "";
        await speak(p1 + p2);
      }
    };

    if (currentPage !== 'home') {
      runPageLogic();
    }

    return () => {
      isActive = false;
      stopListening();
    };
  }, [currentPage]);

  // --- Feature Handlers ---
  // Note: In production, these call our backend (e.g., POST /api/v1/vision/describe)
  const handleDescribeScene = async () => {
    if (!cameraReady) { speak(t('camera_unavail', currentLanguage)); return; }
    setProcessing(true);
    setStatus(t('status_analyzing', currentLanguage));
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, `Describe the surroundings concisely for a blind person. Mention any immediate obstacles or people. Keep it under 3 sentences. Reply ONLY in the ${currentLanguage} language.`);
        if (response === "TOKENS_FINISHED") {
          const warning = t('tokens_finished', currentLanguage);
          setStatus(warning);
          await speak(warning);
        } else {
          setStatus(response);
          await speak(response);
        }
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak(t('service_unavail', currentLanguage));
    } finally {
      setProcessing(false);
    }
  };

  const handleIdentifyCurrency = async () => {
    if (!cameraReady) { speak(t('camera_unavail', currentLanguage)); return; }
    setProcessing(true);
    setStatus("Identifying currency...");
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, `Identify the Indian currency note in this image. State only the denomination. If unclear, say 'Currency not clear. Please hold steady.'. Reply ONLY in the ${currentLanguage} language.`);
        if (response === "TOKENS_FINISHED") {
          const warning = t('tokens_finished', currentLanguage);
          setStatus(warning);
          await speak(warning);
        } else {
          setStatus(response);
          await speak(response);
        }
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak(t('service_unavail', currentLanguage));
    } finally {
      setProcessing(false);
    }
  };

  const handleFindObject = async (objName: string) => {
    if (!cameraReady) { speak(t('camera_unavail', currentLanguage)); return; }
    setProcessing(true);
    setStatus(`Looking for ${objName}...`);
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, `Find the ${objName} in this image. Tell me where it is (left, right, center) and approximate distance. Provide hand guidance like 'Move hand right'. If not found, say so. Keep it very short. Reply ONLY in the ${currentLanguage} language.`);
        if (response === "TOKENS_FINISHED") {
          const warning = t('tokens_finished', currentLanguage);
          setStatus(warning);
          await speak(warning);
        } else {
          setStatus(response);
          await speak(response);
        }
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak(t('service_unavail', currentLanguage));
    } finally {
      setProcessing(false);
    }
  };

  const handleNavigate = async (dest: string) => {
    if (!cameraReady) { speak(t('camera_unavail', currentLanguage)); return; }
    setProcessing(true);
    setStatus(`Navigating to ${dest}...`);
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, `The user wants to navigate to: ${dest}. Describe the immediate path forward, identifying any obstacles, doors, or turns. Keep it under 2 sentences. Reply ONLY in the ${currentLanguage} language.`);
        if (response === "TOKENS_FINISHED") {
          const warning = t('tokens_finished', currentLanguage);
          setStatus(warning);
          await speak(warning);
        } else {
          setStatus(response);
          await speak(response);
        }
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak(t('service_unavail', currentLanguage));
    } finally {
      setProcessing(false);
    }
  };

  // --- Theme Classes ---
  // Requested Light Mode: bg #F4F9FF, cards white, text #0D47A1. Dark Mode: bg #0A192F, cards #112240, text #E3F2FD.
  const bgClass = isDarkMode ? "bg-[#0A192F] text-[#E3F2FD]" : "bg-[#F4F9FF] text-[#0D47A1]";
  const cardClass = isDarkMode ? "bg-[#112240] border-[#112240] text-[#E3F2FD] shadow-md" : "bg-white border-white text-[#0D47A1] shadow-md";
  const headerClass = "bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] border-transparent text-white shadow-lg";
  const inputClass = isDarkMode ? "bg-[#0A192F] border-[#42A5F5] text-[#E3F2FD] focus:ring-[#42A5F5]" : "bg-[#E3F2FD] border-[#1E88E5] text-[#0D47A1] focus:ring-[#1E88E5]";
  const buttonGradientClass = "bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] text-white border-transparent";

  // --- Render Helpers ---
  const renderHeader = (title: string, showBack = true) => (
    <header className={`fixed top-0 w-full z-[1000] h-16 px-4 flex justify-between items-center ${headerClass}`}>
      <div className="w-1/4 flex justify-start">
        {showBack && (
          <button onClick={() => { setCurrentPage('home'); stopSpeaking(); stopListening(); setDestCoords(null); }} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft className="text-white" />
          </button>
        )}
      </div>
      <div className="w-2/4 flex items-center justify-center gap-3 text-center">
        {!showBack && (
          <img
            src="/eye.png"
            alt="App Logo"
            className="max-h-[44px] w-auto object-contain drop-shadow-md brightness-0 invert"
          />
        )}
        <h1 className={`${showBack ? 'text-xl' : 'text-2xl'} font-extrabold tracking-tight whitespace-nowrap drop-shadow-sm`}>{title}</h1>
      </div>
      <div className="w-1/4 flex justify-end items-center gap-3">
        {isListening && <Mic className="text-white animate-pulse" size={20} />}
        {isSpeaking && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
      </div>
    </header>
  );

  // Permissions State Hook
  const [sysPermissions, setSysPermissions] = useState({ camera: 'prompt', mic: 'prompt', location: 'prompt' });

  useEffect(() => {
    if (currentPage === 'permissions') {
      const checkPermissions = async () => {
        try {
          const cam = await navigator.permissions.query({ name: 'camera' as PermissionName }).then(res => res.state).catch(() => 'prompt');
          const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName }).then(res => res.state).catch(() => 'prompt');
          const loc = await navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(res => res.state).catch(() => 'prompt');
          setSysPermissions({ camera: cam, mic, location: loc });
        } catch { } // If browser blocks query, fail silently and keep as prompt
      };
      checkPermissions();
      // Poll every 2 seconds while page is open so it live-updates if user changes OS settings
      const interval = setInterval(checkPermissions, 2000);
      return () => clearInterval(interval);
    }
  }, [currentPage]);

  const handleRequestSysPermission = async (type: string) => {
    try {
      if (type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => stream.getTracks().forEach(t => t.stop()));
      } else if (type === 'microphone') {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => stream.getTracks().forEach(t => t.stop()));
      } else if (type === 'geolocation') {
        await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      }
    } catch (e) {
      speak(`Please click the browser lock icon to enable ${type} permission.`);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col pt-16 transition-colors duration-300 ${bgClass}`}>
      <video ref={videoRef} className="hidden" playsInline muted />

      <AnimatePresence mode="wait">
        {currentPage === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {renderHeader(t('app_title', currentLanguage) || 'EchoSight', false)}

            <div className="flex-none p-4 min-h-[0px] flex flex-col items-center justify-center">
              {status !== t('status_ready', currentLanguage) && (
                <div className="bg-blue-50 text-blue-900 px-6 py-4 rounded-2xl w-full max-w-sm text-center shadow-sm mb-2">
                  <p className="text-lg font-semibold">{status}</p>
                </div>
              )}
              {cameraError && (
                <div className="bg-red-50 text-red-900 px-6 py-4 rounded-2xl w-full max-w-sm text-center shadow-sm mb-2">
                  <p className="text-sm font-semibold">Camera Error: {cameraError}</p>
                </div>
              )}
            </div>

            <BannerCarousel />

            <div className="flex-1 overflow-y-auto px-4 pb-8 w-full">
              <div className="grid grid-cols-2 gap-4 w-full h-full content-start max-w-md mx-auto">
                <AccessibleButton icon={<MapIcon size={36} />} label={t('btn_navigate', currentLanguage)} onActivate={() => { setCurrentPage('navigate'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<Search size={36} />} label={t('btn_find', currentLanguage)} onActivate={() => { setCurrentPage('find'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<Eye size={36} />} label={t('btn_describe', currentLanguage)} onActivate={() => { setCurrentPage('describe'); }} speak={speak} disabled={processing} color={cardClass} />
                <AccessibleButton icon={<Banknote size={36} />} label={t('btn_currency', currentLanguage)} onActivate={() => { setCurrentPage('currency'); }} speak={speak} disabled={processing} color={cardClass} />
                <AccessibleButton icon={<Languages size={36} />} label={t('btn_language', currentLanguage)} onActivate={() => { setCurrentPage('language'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<Bell size={36} />} label={t('btn_notify', currentLanguage) || "Notify Area"} onActivate={() => { setCurrentPage('notify'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<Shield size={36} />} label={t('btn_permissions', currentLanguage)} onActivate={() => { setCurrentPage('permissions'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<HeartPulse size={36} />} label={t('btn_emergency', currentLanguage)} onActivate={() => { setCurrentPage('emergency'); }} speak={speak} color="bg-red-600 border-red-700 text-white" />
                <AccessibleButton icon={<Info size={36} />} label="About Us" onActivate={() => { setCurrentPage('about'); }} speak={speak} color={cardClass} />
                <AccessibleButton icon={<HelpCircle size={36} />} label="How To Use" onActivate={() => { setCurrentPage('how-to-use'); }} speak={speak} color={cardClass} />
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'navigate' && (
          <motion.div key="navigate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader(t('btn_navigate', currentLanguage) || 'Live Navigation')}
            <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-[#0A192F]' : 'bg-[#E3F2FD]'}`}>
              {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0 text-center" /> : <p className="text-[#0D47A1] dark:text-[#E3F2FD] text-lg font-medium opacity-70">Camera Off</p>}
              <div className="absolute bottom-10 w-full text-center text-white text-2xl font-bold drop-shadow-lg px-4">
                {destination ? `Navigating to: ${destination}` : "Listening..."}
                <br />
                <span className="text-lg font-normal">{status}</span>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'find' && (
          <motion.div key="find" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Find Object')}
            <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-[#0A192F]' : 'bg-[#E3F2FD]'}`}>
              {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0 text-center" /> : <p className="text-[#0D47A1] dark:text-[#E3F2FD] text-lg font-medium opacity-70">Camera Off</p>}
              <div className="absolute bottom-10 w-full text-center text-white text-2xl font-bold drop-shadow-lg px-4">
                {targetObject ? `Finding: ${targetObject}` : "Listening..."}
                <br />
                <span className="text-lg font-normal">{status}</span>
              </div>
            </div>
          </motion.div>
        )}

        {(currentPage === 'describe' || currentPage === 'currency') && (
          <motion.div key="camera-feature" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader(currentPage === 'describe' ? 'Describe Scene' : 'Identify Currency')}
            <div className={`flex-1 flex items-center justify-center relative overflow-hidden ${isDarkMode ? 'bg-[#0A192F]' : 'bg-[#E3F2FD]'}`}>
              {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0 text-center" /> : <p className="text-[#0D47A1] dark:text-[#E3F2FD] text-lg font-medium opacity-70">Camera Off</p>}
            </div>
            <div className={`p-6 border-t border-transparent min-h-[200px] flex flex-col items-center justify-center gap-6 ${cardClass}`}>
              <p className={`text-xl font-medium text-center leading-relaxed text-[#0D47A1] dark:text-[#E3F2FD]`}>{status}</p>
              <AccessibleButton
                icon={currentPage === 'describe' ? <Eye size={24} /> : <Banknote size={24} />}
                label={t('btn_analyze_again', currentLanguage)}
                onActivate={() => currentPage === 'describe' ? handleDescribeScene() : handleIdentifyCurrency()}
                speak={speak}
                disabled={processing}
                color={buttonGradientClass}
              />
            </div>
          </motion.div>
        )}

        {currentPage === 'language' && (
          <motion.div key="language" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader(t('btn_language', currentLanguage))}
            <div className="p-4 text-center">
              <p className="text-lg font-medium opacity-80">{t('lang_prompt_visual', currentLanguage)}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 w-full">
              <div className="grid grid-cols-2 gap-4 w-full content-start max-w-md mx-auto">
                {Object.keys(LANGUAGE_CONFIG).map((lang) => (
                  <AccessibleButton
                    key={lang}
                    icon={<Languages size={24} />}
                    label={lang}
                    onActivate={() => {
                      stopSpeaking();
                      stopListening();
                      setCurrentLanguage(lang);
                      localStorage.setItem('appLanguage', lang);
                      const confirmText = LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG]?.confirmText || `Language changed to ${lang}`;
                      speak(confirmText);
                      setCurrentPage('home');
                    }}
                    speak={speak}
                    color={currentLanguage === lang ? "bg-emerald-600 text-white border-emerald-700" : cardClass}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'notify' && (
          <motion.div key="notify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`flex-1 flex flex-col ${bgClass}`}>
            {renderHeader('Notify Contacts')}
            <div className="flex-1 p-6 overflow-y-auto space-y-8 pb-20">

              {/* User Details Box */}
              <div className={`p-5 rounded-2xl shadow-sm border ${cardClass}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><MapIcon size={20} /> Journey Details</h3>
                  <button
                    onClick={() => {
                      setIsLocationSaved(!isLocationSaved);
                      if (!isLocationSaved) {
                        speak("Tracking settings saved.");
                      } else {
                        speak("Edit tracking settings.");
                      }
                    }}
                    className={`p-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isLocationSaved ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                  >
                    {isLocationSaved ? <><Edit2 size={16} /> Edit</> : <><Save size={16} /> Save</>}
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Traveler Name</label>
                    <input
                      type="text"
                      value={notifyName}
                      onChange={e => setNotifyName(e.target.value)}
                      disabled={isLocationSaved}
                      placeholder="Enter your name"
                      className={`w-full p-3 rounded-xl border ${inputClass} ${isLocationSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Destination Name</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                      disabled={isLocationSaved}
                      placeholder="e.g. Work, Home, Station"
                      className={`w-full p-3 rounded-xl border ${inputClass} ${isLocationSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                {!isLocationSaved && (
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
                      placeholder="Search for a location..."
                      className={`flex-1 p-3 rounded-xl border text-sm ${inputClass}`}
                    />
                    <button
                      onClick={handleSearchLocation}
                      className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                )}

                <div className={`mt-4 rounded-xl overflow-hidden border shadow-sm h-64 sticky w-full z-0 relative ${isDarkMode ? 'border-[#42A5F5]/30' : 'border-[#1E88E5]/30'}`}>
                  {isLocationSaved && <div className="absolute inset-0 z-50 bg-black/5 cursor-not-allowed" />}
                  <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <MapUpdater center={mapCenter} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {destCoords && <Marker position={[destCoords.lat, destCoords.lng]} />}
                    <MapClickHandler onMapClick={(lat, lng) => {
                      if (isLocationSaved) return;
                      setDestCoords({ lat, lng });
                      setDestination(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
                      speak("Destination selected. Please save to activate tracking.");
                    }} />
                  </MapContainer>
                </div>
                {destCoords && (
                  <div className={`mt-4 p-3 rounded-xl border text-center transition-colors ${isLocationSaved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : `${inputClass}`}`}>
                    <h4 className="font-bold flex items-center justify-center gap-2">
                      {isLocationSaved ? <>Tracking Active 🟢</> : <>Tracking Paused ⏸️</>}
                    </h4>
                    <p className="text-sm mt-1">Distance: {currentDistance !== null ? `${Math.round(currentDistance)}m` : 'Calculating...'} • WhatsApp Enabled</p>
                  </div>
                )}
              </div>

              {/* Number List Box */}
              <div className={`p-5 rounded-2xl shadow-sm border ${cardClass}`}>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><PhoneCall size={20} /> Broadcast Numbers</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="tel"
                    value={newNumber}
                    onChange={e => setNewNumber(e.target.value)}
                    placeholder="+91..."
                    className={`flex-1 p-3 rounded-xl border text-sm ${inputClass}`}
                  />
                  <button
                    onClick={() => {
                      if (newNumber.length >= 10 && !notifyNumbers.includes(newNumber)) {
                        // Simple E164 fallback formatting if not provided
                        const formatted = newNumber.startsWith('+') ? newNumber : `+91${newNumber.replace(/\D/g, '')}`;
                        setNotifyNumbers([...notifyNumbers, formatted]);
                        setNewNumber('');
                      }
                    }}
                    className="px-4 bg-emerald-600 text-white rounded-xl font-medium"
                  >
                    Add
                  </button>
                </div>

                <ul className="space-y-2">
                  {notifyNumbers.length === 0 && <p className="text-sm opacity-50 text-center py-2">No numbers added. Will fallback to Emergency Contact.</p>}
                  {notifyNumbers.map((num) => (
                    <li key={num} className={`flex justify-between items-center p-3 rounded-xl ${inputClass}`}>
                      <span className="font-medium tracking-wide">{num}</span>
                      <button onClick={() => setNotifyNumbers(notifyNumbers.filter(n => n !== num))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* QR Share Box */}
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col items-center text-center ${cardClass}`}>
                <div className="bg-white p-4 rounded-xl shadow-inner mb-4">
                  <QRCodeSVG
                    value={sandboxCode ? `https://wa.me/14155238886?text=${encodeURIComponent(sandboxCode)}` : `https://wa.me/14155238886`}
                    size={150}
                  />
                </div>
                <h3 className="font-bold text-lg flex items-center gap-2 justify-center"><QrCode size={20} /> Family Pairing</h3>
                <p className="text-sm opacity-70 mt-2 mb-4">Guardians can scan this QR code to connect to the Twilio Sandbox.</p>
                <input
                  type="text"
                  value={sandboxCode}
                  onChange={e => setSandboxCode(e.target.value)}
                  placeholder="Enter Sandbox Join Code (e.g. 'join fruit-orange')"
                  className={`w-full max-w-sm p-3 rounded-xl border text-sm text-center ${inputClass}`}
                />
              </div>

            </div>
          </motion.div>
        )}

        {currentPage === 'emergency' && (
          <motion.div key="emergency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Emergency Info')}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Medical Details</h2>
                <button onClick={() => setIsEditingEmergency(!isEditingEmergency)} className={`p-2 rounded-full ${cardClass}`}>
                  {isEditingEmergency ? <Save size={20} /> : <Edit2 size={20} />}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium opacity-70 mb-1">Full Name</label>
                  {isEditingEmergency ? (
                    <input type="text" value={emergencyData.name} onChange={e => setEmergencyData({ ...emergencyData, name: e.target.value })} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                  ) : (
                    <p className="text-xl font-semibold">{emergencyData.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Age</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.age} onChange={e => setEmergencyData({ ...emergencyData, age: e.target.value })} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold">{emergencyData.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Blood Type</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.bloodType} onChange={e => setEmergencyData({ ...emergencyData, bloodType: e.target.value })} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold text-red-500">{emergencyData.bloodType}</p>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#1E88E5]/20 dark:border-[#42A5F5]/30">
                  <h2 className="text-2xl font-bold mb-4">Emergency Contact</h2>
                  <div className="mb-4">
                    <label className="block text-sm font-medium opacity-70 mb-1">Contact Name</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.contactName} onChange={e => setEmergencyData({ ...emergencyData, contactName: e.target.value })} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold">{emergencyData.contactName}</p>
                    )}
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium opacity-70 mb-1">Phone Number</label>
                    {isEditingEmergency ? (
                      <input type="tel" value={emergencyData.contactPhone} onChange={e => setEmergencyData({ ...emergencyData, contactPhone: e.target.value })} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold">{emergencyData.contactPhone}</p>
                    )}
                  </div>

                  {!isEditingEmergency && (
                    <a
                      href={`tel:${emergencyData.contactPhone}`}
                      className="flex items-center justify-center p-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xl transition-colors shadow-lg"
                    >
                      <PhoneCall className="mr-3" size={28} />
                      Call {emergencyData.contactName}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'permissions' && (
          <motion.div key="permissions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Permissions')}
            <div className="flex-1 p-6">
              <p className="text-lg mb-6 opacity-80">Manage application permissions required for core features.</p>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex justify-between items-center ${cardClass}`}>
                  <div className="flex items-center gap-3">
                    <Eye className="text-blue-500" />
                    <span className="font-medium">Camera</span>
                  </div>
                  {sysPermissions.camera === 'granted' ? (
                    <span className="text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full">Granted</span>
                  ) : (
                    <button onClick={() => handleRequestSysPermission('camera')} className="text-blue-500 text-sm font-bold border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50">Request / Off</button>
                  )}
                </div>
                <div className={`p-4 rounded-xl border flex justify-between items-center ${cardClass}`}>
                  <div className="flex items-center gap-3">
                    <Mic className="text-purple-500" />
                    <span className="font-medium">Microphone</span>
                  </div>
                  {sysPermissions.mic === 'granted' ? (
                    <span className="text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full">Granted</span>
                  ) : (
                    <button onClick={() => handleRequestSysPermission('microphone')} className="text-purple-500 text-sm font-bold border border-purple-500 px-3 py-1 rounded-full hover:bg-purple-50">Request / Off</button>
                  )}
                </div>
                <div className={`p-4 rounded-xl border flex justify-between items-center ${cardClass}`}>
                  <div className="flex items-center gap-3">
                    <MapIcon className="text-emerald-500" />
                    <span className="font-medium">Location</span>
                  </div>
                  {sysPermissions.location === 'granted' ? (
                    <span className="text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full">Granted</span>
                  ) : (
                    <button onClick={() => handleRequestSysPermission('geolocation')} className="text-emerald-500 text-sm font-bold border border-emerald-500 px-3 py-1 rounded-full hover:bg-emerald-50">Request / Off</button>
                  )}
                </div>
              </div>
              <p className="text-sm mt-6 opacity-60 text-center">
                Permissions can be fully managed in your device's system settings.
              </p>
            </div>
          </motion.div>
        )}
        {currentPage === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('About EchoSight')}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-2xl font-bold mb-3 text-[#1E88E5] dark:text-[#42A5F5]">Overview</h2>
                <p className="text-lg leading-relaxed opacity-90">
                  EchoSight is an AI-powered accessibility application designed to assist visually impaired individuals in navigating and understanding their surroundings.
                </p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-2xl font-bold mb-3 text-[#1E88E5] dark:text-[#42A5F5]">Features</h2>
                <ul className="list-disc pl-5 space-y-2 text-lg opacity-90">
                  <li>Scene Description using AI</li>
                  <li>Currency Detection</li>
                  <li>Smart Navigation</li>
                  <li>Family Safety Notifications</li>
                  <li>WhatsApp Alert System</li>
                  <li>Real-time Location Tracking</li>
                </ul>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-2xl font-bold mb-3 text-[#1E88E5] dark:text-[#42A5F5]">Mission</h2>
                <p className="text-lg leading-relaxed font-medium italic opacity-90">
                  "To empower independence and safety for visually impaired users using intelligent technology."
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'how-to-use' && (
          <motion.div key="how-to-use" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('How To Use')}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#1E88E5] dark:text-[#42A5F5]"><Eye size={24} /> Scene Description</h2>
                <p className="text-base leading-relaxed opacity-90">
                  Tap the "Describe Area" button. Point your camera forward, and the AI will analyze objects, lighting, and layout, returning detailed voice feedback of your surroundings.
                </p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#1E88E5] dark:text-[#42A5F5]"><MapIcon size={24} /> Navigation</h2>
                <p className="text-base leading-relaxed opacity-90">
                  Tap "Navigate". Speak your desired destination. The intelligent AI will scan your current visual field and guide your steps around obstacles toward your goal in real-time.
                </p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-[#1E88E5] dark:text-[#42A5F5]"><Bell size={24} /> Notify Feature</h2>
                <p className="text-base leading-relaxed opacity-90">
                  1. Add trusted WhatsApp numbers.<br />
                  2. Search for your remote destination on the map and tap "Save" to lock tracking.<br />
                  3. The system will automatically live-update your loved ones as you move.
                </p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm ${cardClass}`}>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-500"><HeartPulse size={24} /> SOS</h2>
                <p className="text-base leading-relaxed opacity-90">
                  In case of danger, Double-Tap the Emergency button. Your device will immediately flash an alert, dial your primary emergency contact line, and sound an alarm.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AccessibleButtonProps {
  icon: React.ReactNode;
  label: string;
  onActivate: () => void;
  speak: (text: string) => void;
  disabled?: boolean;
  color?: string;
  key?: string;
}

function AccessibleButton({ icon, label, onActivate, speak, disabled, color = "bg-white text-[#0D47A1] border-white shadow-md dark:bg-[#112240] dark:text-[#E3F2FD] dark:border-[#112240]" }: AccessibleButtonProps) {
  const handleTap = useAccessibleButton(label, onActivate, speak);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleTap}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-6 rounded-[16px] shadow-sm border ${color} ${disabled ? 'opacity-50' : 'active:opacity-80'} transition-colors touch-manipulation`}
    >
      <div className="mb-3 pointer-events-none">{icon}</div>
      <span className="text-lg font-semibold tracking-tight pointer-events-none">{label}</span>
    </motion.button>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function VideoPreview({ stream, className }: { stream: MediaStream | null, className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className={`object-cover ${className}`} />;
}
