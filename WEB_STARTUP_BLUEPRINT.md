# Assistive Vision – Web-Based Voice AI Navigation System (Free Map Stack)

## 1. Complete Frontend Folder Structure (Vite + React)

```text
assistive-vision-web/
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icons/               # App icons
├── src/
│   ├── assets/              # Images, fonts
│   ├── components/
│   │   ├── ui/              # Reusable UI (AccessibleButton, etc.)
│   │   ├── map/             # Leaflet Map components
│   │   └── camera/          # Video preview components
│   ├── hooks/
│   │   ├── useCamera.ts     # getUserMedia logic
│   │   ├── useSpeech.ts     # Web Speech API wrapper
│   │   └── useLocation.ts   # Geolocation API wrapper
│   ├── services/
│   │   ├── api.ts           # Axios client for backend proxy
│   │   ├── routing.ts       # OSRM / OpenRouteService logic
│   │   └── geocoding.ts     # Nominatim (OSM) geocoding
│   ├── store/               # Zustand or Context for global state (Language)
│   ├── App.tsx              # Main routing and layout
│   ├── index.css            # Tailwind global styles
│   └── main.tsx             # React entry point
├── .env.example             # Environment variables
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## 2. Leaflet + OpenStreetMap Integration Example

```tsx
// src/components/map/NavigationMap.tsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon issue in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function NavigationMap({ 
  currentLocation, 
  routeCoordinates 
}: { 
  currentLocation: [number, number], 
  routeCoordinates: [number, number][] 
}) {
  return (
    <MapContainer 
      center={currentLocation} 
      zoom={15} 
      style={{ height: '100%', width: '100%', zIndex: 1 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={currentLocation} />
      <Marker position={currentLocation} />
      {routeCoordinates.length > 0 && (
        <Polyline positions={routeCoordinates} color="blue" weight={5} />
      )}
    </MapContainer>
  );
}
```

## 3. OpenRouteService / OSRM Routing Example

Using the free public OSRM API (no API key required):

```typescript
// src/services/routing.ts
export async function getRoute(start: [number, number], end: [number, number]) {
  // OSRM expects coordinates in [longitude, latitude] format
  const startStr = `${start[1]},${start[0]}`;
  const endStr = `${end[1]},${end[0]}`;
  
  const url = `https://router.project-osrm.org/route/v1/walking/${startStr};${endStr}?overview=full&geometries=geojson`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok') throw new Error('Routing failed');
    
    // Convert GeoJSON [lng, lat] back to Leaflet [lat, lng]
    const coordinates = data.routes[0].geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );
    
    return {
      coordinates,
      distance: data.routes[0].distance,
      duration: data.routes[0].duration
    };
  } catch (error) {
    console.error("OSRM Routing Error:", error);
    return null;
  }
}
```

## 4. Backend Proxy Structure (Node.js / Express)

```text
assistive-vision-proxy/
├── src/
│   ├── controllers/
│   │   ├── visionController.js  # Handles Gemini API calls
│   │   └── voiceController.js   # Handles Sarvam API calls
│   ├── routes/
│   │   └── api.js               # Express router
│   ├── middleware/
│   │   ├── rateLimiter.js       # Express-rate-limit
│   │   └── errorHandler.js      # Global error handler
│   └── server.js                # Express app setup
├── .env                         # GEMINI_API_KEY, SARVAM_API_KEY
├── package.json
└── vercel.json                  # Vercel serverless deployment config
```

## 5. Gemini API Backend Integration Example

```javascript
// src/controllers/visionController.js
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.analyzeImage = async (req, res, next) => {
  try {
    const { imageBase64, prompt } = req.body;
    
    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: 'Missing image or prompt' });
    }

    // Strip data:image/jpeg;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
        prompt
      ]
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    next(error); // Pass to global error handler
  }
};
```

## 6. Sarvam API Integration Example (Backend)

```javascript
// src/controllers/voiceController.js
const axios = require('axios');

exports.synthesizeSpeech = async (req, res, next) => {
  try {
    const { text, languageCode } = req.body;

    const response = await axios.post('https://api.sarvam.ai/v1/text-to-speech', {
      text: text,
      language_code: languageCode,
      speaker: "meera"
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', 'audio/wav');
    res.send(response.data);
  } catch (error) {
    console.error("Sarvam API Error:", error);
    next(error);
  }
};
```

## 7. Mobile-First Responsive CSS Layout

Using Tailwind CSS, the layout is designed to be full-height and prevent scroll jank.

```css
/* index.css */
@import "tailwindcss";

@layer utilities {
  /* Prevent pull-to-refresh and overscroll on mobile */
  .no-overscroll {
    overscroll-behavior-y: none;
  }
  
  /* Hide scrollbar for clean UI */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden; /* Prevent body scrolling, handle scrolling in containers */
  background-color: #ffffff;
  color: #111827;
}
```

## 8. Performance Optimization Checklist

- [x] **Lazy Loading**: Use `React.lazy()` for heavy components like the Leaflet Map so the initial bundle size remains small.
- [x] **Throttling**: Throttle camera frame extraction to 1-2 FPS when sending to the backend to prevent network congestion.
- [x] **Debouncing**: Debounce GPS location updates (e.g., every 3-5 seconds) before recalculating routes to save battery and CPU.
- [x] **Image Compression**: Resize canvas to max 640x640 and use `image/jpeg` at 0.7 quality before base64 encoding.
- [x] **Web Workers**: Move heavy base64 encoding or image manipulation off the main thread if necessary.
- [x] **Caching**: Cache static TTS responses (like "How can I help you?") using the browser's Cache API or IndexedDB.

## 9. Deployment Instructions for Vercel

1. **Frontend Deployment**:
   - Connect your GitHub repository to Vercel.
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: Add `VITE_BACKEND_URL` pointing to your deployed backend proxy.

2. **Backend Proxy Deployment (Vercel Serverless Functions)**:
   - Create an `api/` directory at the root of your frontend project.
   - Place your Express/Node.js logic inside `api/index.js`.
   - Vercel will automatically deploy files in the `api/` folder as Serverless Functions.
   - Add `GEMINI_API_KEY` and `SARVAM_API_KEY` to the Vercel project's Environment Variables.

## 10. Future Android Conversion Strategy

To convert this web app into a native Android application, you have two primary paths:

**Path A: Trusted Web Activity (TWA) / WebView (Fastest)**
- Wrap the deployed Vercel PWA in an Android WebView using Bubblewrap or Android Studio.
- **Pros**: Zero code rewrite. Instant updates without app store reviews.
- **Cons**: Limited access to background services (e.g., continuous background camera for obstacle detection while screen is off).

**Path B: React Native / Expo (Recommended for Startup)**
- Port the React codebase to React Native.
- Replace `react-leaflet` with `react-native-maps` (using OSM tiles).
- Replace `getUserMedia` with `react-native-vision-camera`.
- **Pros**: Near-native performance. Full access to background services, native TTS, and on-device TensorFlow Lite models for zero-latency obstacle detection.
- **Cons**: Requires rewriting UI components from HTML/Tailwind to React Native StyleSheet/Views.
