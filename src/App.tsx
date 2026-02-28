/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useSpeech, useAccessibleButton, parseSpokenNumber, LANGUAGE_CONFIG } from './hooks/useSpeech';
// In a production app, this would call our custom backend, not Gemini directly.
import { analyzeScene } from './services/gemini';
import { Search, Eye, Map, Languages, Mic, Banknote, ArrowLeft, Shield, HeartPulse, PhoneCall, Save, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'];

export default function App() {
  const { videoRef, isReady: cameraReady, error: cameraError, captureImage, stream } = useCamera();
  const { speak, listen, speakAndListen, stopSpeaking, stopListening, isListening, isSpeaking } = useSpeech();
  
  const [status, setStatus] = useState('Ready');
  const [processing, setProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('appLanguage') || 'English');
  const [currentPage, setCurrentPage] = useState('home');
  const isDarkMode = false; // Add toggle later if needed
  
  // Feature specific states
  const [destination, setDestination] = useState('');
  const [targetObject, setTargetObject] = useState('');

  // Emergency feature states
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    name: 'John Doe',
    age: '35',
    bloodType: 'O+',
    contactName: 'Jane Doe',
    contactPhone: '911'
  });

  // Welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      speak("Single tap to hear button name. Double tap to open feature.");
    }, 1000);
    return () => clearTimeout(timer);
  }, [speak]);

  // --- Page Lifecycle & Voice Prompts ---
  useEffect(() => {
    let isActive = true;

    const runPageLogic = async () => {
      if (currentPage === 'navigate') {
        setDestination('');
        try {
          const dest = await speakAndListen("Where do you want to go?", 2);
          if (isActive && dest) {
            setDestination(dest);
            await speak(`Navigating to ${dest}. Path clear. Walk forward.`);
            setStatus(`Navigating to ${dest}`);
          }
        } catch (e) {
          if (isActive) {
            await speak("No destination detected. Returning to home.");
            setCurrentPage('home');
          }
        }
      } else if (currentPage === 'find') {
        setTargetObject('');
        try {
          const obj = await speakAndListen("What are you looking for?", 2);
          if (isActive && obj) {
            setTargetObject(obj);
            await speak(`Looking for ${obj}. Scanning area.`);
            handleFindObject(obj);
          }
        } catch (e) {
          if (isActive) {
            await speak("No object detected. Returning to home.");
            setCurrentPage('home');
          }
        }
      } else if (currentPage === 'language') {
        try {
          const ans = await speakAndListen("Do you want to change language? Say yes or no.");
          if (ans.toLowerCase().includes('yes') || ans.toLowerCase().includes('haan') || ans.toLowerCase().includes('हाँ')) {
            let validChoice = false;
            let retries = 0;
            while (isActive && !validChoice && retries < 3) {
              try {
                const numStr = await speakAndListen("Say 1 for Hindi. Say 2 for Marathi. Say 3 for Tamil. Say 4 for Telugu. Say 5 for Bengali. Say 0 to cancel.");
                const num = parseSpokenNumber(numStr);
                
                let newLang = '';
                if (num === 1) newLang = 'Hindi';
                else if (num === 2) newLang = 'Marathi';
                else if (num === 3) newLang = 'Tamil';
                else if (num === 4) newLang = 'Telugu';
                else if (num === 5) newLang = 'Bengali';
                else if (num === 0) {
                  await speak("Cancelled.");
                  validChoice = true;
                  break;
                }
                
                if (newLang) {
                  setCurrentLanguage(newLang);
                  localStorage.setItem('appLanguage', newLang);
                  const confirmText = LANGUAGE_CONFIG[newLang as keyof typeof LANGUAGE_CONFIG]?.confirmText || `Language changed to ${newLang}`;
                  await speak(confirmText);
                  validChoice = true;
                } else {
                  retries++;
                  if (retries < 3) await speak("Invalid choice. Please say a number between 0 and 5.");
                }
              } catch (e) {
                retries++;
                if (isActive && retries < 3) await speak("Please repeat.");
              }
            }
            if (!validChoice && isActive) {
              await speak("Too many invalid attempts. Returning to home.");
            }
          } else {
            await speak("Cancelled.");
          }
        } catch (e) {
          if (isActive) await speak("Please repeat.");
        } finally {
          if (isActive) setCurrentPage('home');
        }
      } else if (currentPage === 'describe') {
        await speak("Analyzing surroundings.");
        handleDescribeScene();
      } else if (currentPage === 'currency') {
        await speak("Show currency in front of camera.");
        handleIdentifyCurrency();
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
    if (!cameraReady) { speak("Camera unavailable."); return; }
    setProcessing(true);
    setStatus("Analyzing scene...");
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, "Describe the surroundings concisely for a blind person. Mention any immediate obstacles or people. Keep it under 3 sentences.");
        setStatus(response);
        await speak(response);
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak("Service unavailable.");
    } finally {
      setProcessing(false);
    }
  };

  const handleIdentifyCurrency = async () => {
    if (!cameraReady) { speak("Camera unavailable."); return; }
    setProcessing(true);
    setStatus("Identifying currency...");
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, "Identify the Indian currency note in this image. State only the denomination. If unclear, say 'Currency not clear. Please hold steady.'");
        setStatus(response);
        await speak(response);
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak("Service unavailable.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFindObject = async (objName: string) => {
    if (!cameraReady) { speak("Camera unavailable."); return; }
    setProcessing(true);
    setStatus(`Looking for ${objName}...`);
    try {
      const image = captureImage();
      if (image) {
        const response = await analyzeScene(image, `Find the ${objName} in this image. Tell me where it is (left, right, center) and approximate distance. Provide hand guidance like 'Move hand right'. If not found, say so. Keep it very short.`);
        setStatus(response);
        await speak(response);
        setTimeout(() => setCurrentPage('home'), 1000);
      }
    } catch (e) {
      speak("Service unavailable.");
    } finally {
      setProcessing(false);
    }
  };

  // --- Theme Classes ---
  const bgClass = isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const cardClass = isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900";
  const headerClass = isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inputClass = isDarkMode ? "bg-gray-800 border-gray-700 text-white focus:ring-white" : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-gray-900";

  // --- Render Helpers ---
  const renderHeader = (title: string, showBack = true) => (
    <header className={`fixed top-0 w-full z-[1000] h-16 px-4 border-b flex justify-between items-center shadow-sm ${headerClass}`}>
      <div className="w-1/4 flex justify-start">
        {showBack && (
          <button onClick={() => { setCurrentPage('home'); stopSpeaking(); stopListening(); }} className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft className={isDarkMode ? "text-white" : "text-gray-900"} />
          </button>
        )}
      </div>
      <div className="w-2/4 flex items-center justify-center gap-2 text-center">
        {!showBack && (
          <img 
            src="/icon.svg" 
            alt="App Logo" 
            className="max-h-[36px] w-auto object-contain p-1" 
          />
        )}
        <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">{title}</h1>
      </div>
      <div className="w-1/4 flex justify-end items-center gap-3">
        {isListening && <Mic className="text-red-500 animate-pulse" size={20} />}
        {isSpeaking && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
      </div>
    </header>
  );

  return (
    <div className={`min-h-screen font-sans flex flex-col pt-16 transition-colors duration-300 ${bgClass}`}>
      <video ref={videoRef} className="hidden" playsInline muted />

      <AnimatePresence mode="wait">
        {currentPage === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {renderHeader('Assistive Vision', false)}
            
            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
              <p className={`text-2xl font-medium leading-relaxed max-w-2xl ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {status}
              </p>
              {cameraError && <p className="text-red-500 mt-4 text-sm">Camera Error: {cameraError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 pb-8 overflow-y-auto">
              <AccessibleButton icon={<Map size={36} />} label="Navigate" onActivate={() => { setCurrentPage('navigate'); }} speak={speak} color={cardClass} />
              <AccessibleButton icon={<Search size={36} />} label="Find Object" onActivate={() => { setCurrentPage('find'); }} speak={speak} color={cardClass} />
              <AccessibleButton icon={<Eye size={36} />} label="Describe Scene" onActivate={() => { setCurrentPage('describe'); }} speak={speak} disabled={processing} color={cardClass} />
              <AccessibleButton icon={<Banknote size={36} />} label="Currency" onActivate={() => { setCurrentPage('currency'); }} speak={speak} disabled={processing} color={cardClass} />
              <AccessibleButton icon={<Languages size={36} />} label="Language" onActivate={() => { setCurrentPage('language'); }} speak={speak} color={cardClass} />
              <AccessibleButton icon={<Shield size={36} />} label="Permissions" onActivate={() => { setCurrentPage('permissions'); }} speak={speak} color={cardClass} />
              <div className="col-span-2">
                <AccessibleButton icon={<HeartPulse size={36} />} label="Emergency Info" onActivate={() => { setCurrentPage('emergency'); }} speak={speak} color="bg-red-600 text-white border-red-700" />
              </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'navigate' && (
          <motion.div key="navigate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Navigation')}
            <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
               {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0" /> : <p className="text-white text-sm">Camera Off</p>}
               <div className="absolute bottom-10 w-full text-center text-white text-2xl font-bold drop-shadow-lg px-4">
                 {status}
               </div>
            </div>
          </motion.div>
        )}

        {currentPage === 'find' && (
          <motion.div key="find" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Find Object')}
            <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
               {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0" /> : <p className="text-white text-sm">Camera Off</p>}
               <div className="absolute bottom-10 w-full text-center text-white text-2xl font-bold drop-shadow-lg px-4">
                 {targetObject ? `Finding: ${targetObject}` : "Listening..."}
                 <br/>
                 <span className="text-lg font-normal">{status}</span>
               </div>
            </div>
          </motion.div>
        )}

        {(currentPage === 'describe' || currentPage === 'currency') && (
          <motion.div key="camera-feature" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader(currentPage === 'describe' ? 'Describe Scene' : 'Identify Currency')}
            <div className="flex-1 bg-gray-900 flex items-center justify-center relative overflow-hidden">
               {stream ? <VideoPreview stream={stream} className="w-full h-full absolute inset-0" /> : <p className="text-white text-sm">Camera Off</p>}
            </div>
            <div className={`p-6 border-t min-h-[200px] flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className={`text-xl font-medium text-center leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{status}</p>
              <AccessibleButton 
                icon={currentPage === 'describe' ? <Eye size={24} /> : <Banknote size={24} />} 
                label="Analyze Again" 
                onActivate={() => currentPage === 'describe' ? handleDescribeScene() : handleIdentifyCurrency()} 
                speak={speak} 
                disabled={processing} 
                color={isDarkMode ? "bg-white text-gray-900" : "bg-gray-900 text-white"} 
              />
            </div>
          </motion.div>
        )}

        {currentPage === 'language' && (
          <motion.div key="language" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
            {renderHeader('Change Language')}
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-2xl font-medium text-center">
                Listening for language selection...
              </p>
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
                    <input type="text" value={emergencyData.name} onChange={e => setEmergencyData({...emergencyData, name: e.target.value})} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                  ) : (
                    <p className="text-xl font-semibold">{emergencyData.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Age</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.age} onChange={e => setEmergencyData({...emergencyData, age: e.target.value})} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold">{emergencyData.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium opacity-70 mb-1">Blood Type</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.bloodType} onChange={e => setEmergencyData({...emergencyData, bloodType: e.target.value})} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold text-red-500">{emergencyData.bloodType}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold mb-4">Emergency Contact</h2>
                  <div className="mb-4">
                    <label className="block text-sm font-medium opacity-70 mb-1">Contact Name</label>
                    {isEditingEmergency ? (
                      <input type="text" value={emergencyData.contactName} onChange={e => setEmergencyData({...emergencyData, contactName: e.target.value})} className={`w-full p-3 rounded-lg border ${inputClass}`} />
                    ) : (
                      <p className="text-xl font-semibold">{emergencyData.contactName}</p>
                    )}
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium opacity-70 mb-1">Phone Number</label>
                    {isEditingEmergency ? (
                      <input type="tel" value={emergencyData.contactPhone} onChange={e => setEmergencyData({...emergencyData, contactPhone: e.target.value})} className={`w-full p-3 rounded-lg border ${inputClass}`} />
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
                  <span className="text-green-500 text-sm font-bold">Granted</span>
                </div>
                <div className={`p-4 rounded-xl border flex justify-between items-center ${cardClass}`}>
                  <div className="flex items-center gap-3">
                    <Mic className="text-purple-500" />
                    <span className="font-medium">Microphone</span>
                  </div>
                  <span className="text-green-500 text-sm font-bold">Granted</span>
                </div>
                <div className={`p-4 rounded-xl border flex justify-between items-center ${cardClass}`}>
                  <div className="flex items-center gap-3">
                    <Map className="text-emerald-500" />
                    <span className="font-medium">Location</span>
                  </div>
                  <span className="text-green-500 text-sm font-bold">Granted</span>
                </div>
              </div>
              <p className="text-sm mt-6 opacity-60 text-center">
                Permissions can be fully managed in your device's system settings.
              </p>
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
}

function AccessibleButton({ icon, label, onActivate, speak, disabled, color = "bg-white text-gray-900" }: AccessibleButtonProps) {
  const handleTap = useAccessibleButton(label, onActivate, speak);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleTap}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border ${color} ${disabled ? 'opacity-50' : 'active:opacity-80'} transition-colors touch-manipulation`}
    >
      <div className="mb-3 pointer-events-none">{icon}</div>
      <span className="text-lg font-semibold tracking-tight pointer-events-none">{label}</span>
    </motion.button>
  );
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
