import React, { useEffect, useState } from 'react';
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
