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

export async function geocode(address: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
}
