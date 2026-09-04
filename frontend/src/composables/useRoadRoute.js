// Asks OSRM for a real driving route between two points. Returns null when a
// road route cannot be produced, so callers can show a clear failure instead
// of pretending a straight line is a road.
export async function fetchRoadRoute(from, to) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 'Ok') return null;
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];

    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]
    const path = [];
    for (let i = 0; i < route.geometry.coordinates.length; i++) {
      const point = route.geometry.coordinates[i];
      path.push([point[1], point[0]]);
    }

    if (path.length < 2) return null;

    return { path, distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch (err) {
    return null;
  }
}
