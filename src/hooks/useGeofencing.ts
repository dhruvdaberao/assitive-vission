import { useState, useEffect, useRef } from 'react';

const REACHED_RADIUS = 50; // meters
const EXIT_RADIUS = 120; // meters
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface GeofenceConfig {
    destinationLat: number;
    destinationLng: number;
    destinationName: string;
    userName: string;
    receiverNumber: string;
    enabled: boolean;
}

// Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export function useGeofencing(config: GeofenceConfig) {
    const [currentDistance, setCurrentDistance] = useState<number | null>(null);
    const [hasReached, setHasReached] = useState(false);

    // Refs to prevent stale closures in async callbacks
    const hasReachedRef = useRef(false);
    const lastSentRef = useRef<{ type: string, time: number } | null>(null);

    const sendWhatsApp = async (type: 'reached' | 'left', lat: number, lng: number) => {
        // Debounce protection
        const now = Date.now();
        if (lastSentRef.current && lastSentRef.current.type === type) {
            if (now - lastSentRef.current.time < COOLDOWN_MS) {
                console.log(`Skipping duplicate '${type}' message due to cooldown.`);
                return;
            }
        }

        try {
            lastSentRef.current = { type, time: now };

            const response = await fetch('/api/send-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    userName: config.userName,
                    destinationName: config.destinationName,
                    receiverNumber: config.receiverNumber,
                    currentLat: lat,
                    currentLng: lng
                }),
            });

            if (!response.ok) {
                console.error("Failed to send WhatsApp message");
                // Clear cooldown lock on fail so it retries next tick
                lastSentRef.current = null;
            }
        } catch (e) {
            console.error("Error triggering WhatsApp:", e);
            lastSentRef.current = null;
        }
    };

    useEffect(() => {
        if (!config.enabled || !navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const dist = getDistance(latitude, longitude, config.destinationLat, config.destinationLng);
                setCurrentDistance(dist);

                // Geofencing Logic
                if (dist <= REACHED_RADIUS && !hasReachedRef.current) {
                    hasReachedRef.current = true;
                    setHasReached(true);
                    sendWhatsApp('reached', latitude, longitude);
                } else if (dist > EXIT_RADIUS && hasReachedRef.current) {
                    hasReachedRef.current = false;
                    setHasReached(false);
                    sendWhatsApp('left', latitude, longitude);
                }
            },
            (error) => {
                console.error("Geolocation watch fault:", error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [config.enabled, config.destinationLat, config.destinationLng, config.destinationName, config.receiverNumber, config.userName]);

    return { currentDistance, hasReached };
}
