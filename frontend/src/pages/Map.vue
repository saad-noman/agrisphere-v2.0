<template>
  <div class="map-page">
    <h2 class="mb-3 px-3 pt-3">Agricultural Services Map</h2>

    <div class="map-page-layout">
      <aside class="map-sidebar">
        <div ref="filterMenuRef" class="mb-3">
          <button type="button" class="btn-pill-outline w-100" @click="showFilters = !showFilters">
            Filters {{ showFilters ? '▲' : '▼' }}
          </button>
          <div v-if="showFilters" class="map-filter-panel">
            <label class="form-label mb-1">Search by name</label>
            <input v-model="filters.search" type="text" class="form-control mb-2" placeholder="Search by name" />

            <label class="form-label mb-1">District</label>
            <input v-model="filters.district" type="text" class="form-control mb-2" placeholder="District" />

            <label class="form-label mb-1">Upazila</label>
            <input v-model="filters.upazila" type="text" class="form-control mb-2" placeholder="Upazila" />

            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn-pill flex-fill" @click="showFilters = false">Apply</button>
              <button type="button" class="btn-pill-secondary flex-fill" @click="clearFilters">Clear</button>
            </div>

            <div v-if="searchResults.length" class="map-search-results mt-3">
              <p class="small text-muted mb-1">Search Results</p>
              <div v-for="item in searchResults" :key="item.type + item.name + item.lat" class="mb-2">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="small">{{ item.name }} <span class="text-muted">({{ item.type }})</span></span>
                </div>
                <button
                  type="button"
                  class="btn-pill-secondary btn-pill-sm mt-1"
                  @click="showDirections(item.lat, item.lng)"
                >
                  Direction
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="btn-pill-outline w-100 mb-3" @click="findNearby()">
          Show Nearby Sites
        </button>

        <button v-if="hasDirections" type="button" class="btn-pill-secondary w-100 mb-3" @click="stopDirections">
          Stop Directions
        </button>

        <div v-if="userLocation" class="map-nearby-list mb-3">
          <p class="form-label mb-2">{{ nearbyRegion ? `Nearby in ${nearbyRegion}` : 'Nearby (within 50 km)' }}</p>
          <p v-if="nearbyList.length === 0" class="small text-muted">Nothing found nearby.</p>
          <div v-for="item in nearbyList" :key="item.type + item.name + item.lat" class="mb-2">
            <div class="fw-bold small">{{ item.name }}</div>
            <div class="text-muted small">{{ item.type }} — {{ item.distanceKm.toFixed(1) }} km</div>
            <button type="button" class="btn-pill-secondary btn-pill-sm mt-1" @click="showDirections(item.lat, item.lng)">
              Directions
            </button>
          </div>
        </div>

        <div class="map-legend">
          <p class="form-label mb-2">Show on map</p>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showExperts" @change="renderMarkers" />
            <span class="map-legend-dot" style="background: var(--green)"></span> Experts
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showOrganizations" @change="renderMarkers" />
            <span class="map-legend-dot" style="background: var(--gold)"></span> Organizations / Services
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showConsultationCenters" @change="renderMarkers" />
            <span class="map-legend-dot" style="background: #c0392b"></span> Consultation Centers
          </label>
        </div>

        <p v-if="nearbyError" class="error-text">{{ nearbyError }}</p>
      </aside>

      <div class="map-main">
        <div ref="mapContainer" class="leaflet-map"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { searchExperts } from '../services/expertService';
import { searchOrganizations } from '../services/organizationService';
import { useClickOutside } from '../composables/useClickOutside';

const route = useRoute();
const mapContainer = ref(null);
let map = null;
let expertLayer = null;
let orgLayer = null;
let consultLayer = null;
let userMarker = null;
let directionsLine = null;

const userLocation = ref(null); // { lat, lng } once known
const nearbyList = ref([]);
const nearbyRegion = ref(''); // name of the user's detected area, e.g. "Mohammadpur"
const hasDirections = ref(false); // true while a route is currently drawn on the map

const showFilters = ref(false);
const filterMenuRef = ref(null);
useClickOutside(filterMenuRef, () => {
  showFilters.value = false;
});

const filters = ref({ search: '', district: '', upazila: '' });

// Individually-named matches for the "Search by name" box, each with its
// own Direction button — separate from the map's category filtering above.
const searchResults = computed(() => {
  const term = filters.value.search.trim().toLowerCase();
  if (!term) return [];

  const items = [];

  allExperts
    .filter((expert) => expert.latitude != null && expert.longitude != null)
    .filter((expert) => expert.fullName?.toLowerCase().includes(term))
    .forEach((expert) => {
      items.push({ type: 'Expert', name: expert.fullName, lat: expert.latitude, lng: expert.longitude });
    });

  allOrganizations
    .filter((org) => org.latitude != null && org.longitude != null)
    .filter((org) => org.name?.toLowerCase().includes(term))
    .forEach((org) => {
      items.push({
        type: org.isConsultationCenter ? 'Consultation Center' : 'Organization',
        name: org.name,
        lat: org.latitude,
        lng: org.longitude,
      });
    });

  return items.slice(0, 10);
});

const showExperts = ref(true);
const showOrganizations = ref(true);
const showConsultationCenters = ref(true);
const nearbyError = ref('');

const defaultLat = Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 23.8103;
const defaultLng = Number(import.meta.env.VITE_MAP_DEFAULT_LNG) || 90.4125;
const defaultZoom = Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 7;

// The full, unfiltered dataset — fetched once. Filters only ever change what
// is rendered from this list, they never discard data, so clearing a filter
// always brings everything back without a fresh request.
let allExperts = [];
let allOrganizations = [];

onMounted(async () => {
  map = L.map(mapContainer.value).setView([defaultLat, defaultLng], defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  expertLayer = L.layerGroup().addTo(map);
  orgLayer = L.layerGroup().addTo(map);
  consultLayer = L.layerGroup().addTo(map);

  // The map fills its container via CSS; make sure Leaflet re-measures it
  // whenever the window is resized (e.g. rotating a phone).
  window.addEventListener('resize', handleWindowResize);

  // Marker popups are plain HTML strings (Leaflet doesn't render Vue inside
  // them), so the "Directions" link inside a popup calls this global bridge
  // to reach our in-app showDirections() function.
  window.showMapDirections = showDirections;

  const expertResponse = await searchExperts();
  allExperts = expertResponse.data;

  const orgResponse = await searchOrganizations();
  allOrganizations = orgResponse.data;

  renderMarkers();
  focusRequestedLocation();
});

// Lets other pages (e.g. an expert profile or organization detail page) deep
// link here with ?type=expert|org&id=... to center the map on that one
// location. The id is looked up in our own already-fetched data rather than
// trusting anything from the URL directly, so nothing unescaped from the
// query string ever ends up in a marker popup.
function focusRequestedLocation() {
  const { type, id } = route.query;
  if (!type || !id) return;

  const list = type === 'expert' ? allExperts : allOrganizations;
  const target = list.find((item) => item._id === id);
  if (!target || target.latitude == null || target.longitude == null) return;

  const label = type === 'expert' ? target.fullName : target.name;
  map.setView([target.latitude, target.longitude], 15);

  const focusMarker = L.circleMarker([target.latitude, target.longitude], {
    radius: 12,
    color: '#1e88e5',
    fillColor: '#1e88e5',
    fillOpacity: 0.5,
  }).addTo(map);
  focusMarker.bindPopup(`<strong>${label}</strong>`).openPopup();
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  delete window.showMapDirections;
  if (map) map.remove();
});

function handleWindowResize() {
  if (map) map.invalidateSize();
}

// Re-render whenever a filter changes, so results update as you type.
watch(filters, renderMarkers, { deep: true });

function clearFilters() {
  filters.value = { search: '', district: '', upazila: '' };
  showFilters.value = false;
}

// Straight-line ("as the crow flies") distance in km between two points.
// Good enough for "nearby" and a simple direction line — no routing API needed.
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Shows the route from the user's location to the given point, right on our
// own map, instead of opening OpenStreetMap's website.
function showDirections(destLat, destLng) {
  if (!userLocation.value) {
    findNearby(() => drawDirectionsLine(destLat, destLng));
    return;
  }
  drawDirectionsLine(destLat, destLng);
}

// Asks OSRM (OpenStreetMap's routing service) for the fastest driving route.
// Returns null if the request fails, so the caller can fall back gracefully.
async function fetchFastestRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    return {
      // GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng].
      path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch (err) {
    return null;
  }
}

async function drawDirectionsLine(destLat, destLng) {
  if (directionsLine) map.removeLayer(directionsLine);

  const from = { lat: userLocation.value.lat, lng: userLocation.value.lng };
  const to = { lat: destLat, lng: destLng };
  const route = await fetchFastestRoute(from, to);

  if (route) {
    directionsLine = L.polyline(route.path, { color: '#1e88e5', weight: 5 }).addTo(map);
    directionsLine
      .bindPopup(`Fastest route: ${route.distanceKm.toFixed(1)} km, about ${Math.round(route.durationMin)} min`)
      .openPopup();
  } else {
    // The routing service didn't respond — fall back to a simple straight line.
    const distanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
    directionsLine = L.polyline(
      [[from.lat, from.lng], [to.lat, to.lng]],
      { color: '#1e88e5', weight: 4, dashArray: '8, 8' }
    ).addTo(map);
    directionsLine.bindPopup(`Straight-line distance: ${distanceKm.toFixed(1)} km (route unavailable)`).openPopup();
  }

  map.fitBounds(directionsLine.getBounds(), { padding: [40, 40] });
  hasDirections.value = true;
}

// Removes the route from the map and restores the default view.
function stopDirections() {
  if (directionsLine) {
    map.removeLayer(directionsLine);
    directionsLine = null;
  }
  hasDirections.value = false;
  map.setView([defaultLat, defaultLng], defaultZoom);
}

// A location matches if every filled-in filter matches that location's own
// fields. Blank filters are ignored, so filtering one field never affects
// locations that don't have (or don't need) a match on another field.
function matchesFilters(location, nameField) {
  const search = filters.value.search.trim().toLowerCase();
  const district = filters.value.district.trim().toLowerCase();
  const upazila = filters.value.upazila.trim().toLowerCase();

  if (search && !location[nameField]?.toLowerCase().includes(search)) return false;
  if (district && !location.district?.toLowerCase().includes(district)) return false;
  if (upazila && !location.upazila?.toLowerCase().includes(upazila)) return false;

  return true;
}

function renderMarkers() {
  expertLayer.clearLayers();
  orgLayer.clearLayers();
  consultLayer.clearLayers();

  if (showExperts.value) {
    allExperts
      .filter((expert) => expert.latitude != null && expert.longitude != null)
      .filter((expert) => matchesFilters(expert, 'fullName'))
      .forEach((expert) => {
        const marker = L.circleMarker([expert.latitude, expert.longitude], {
          radius: 8,
          color: '#2f6b3a',
          fillColor: '#2f6b3a',
          fillOpacity: 0.8,
        });
        marker.bindPopup(
          `<strong>${expert.fullName}</strong><br>` +
            `${expert.specialization || ''}<br>` +
            `<a href="/experts/${expert._id}">View Profile</a> | ` +
            `<a href="#" onclick="window.showMapDirections(${expert.latitude}, ${expert.longitude}); return false;">Directions</a>`
        );
        expertLayer.addLayer(marker);
      });
  }

  allOrganizations
    .filter((org) => org.latitude != null && org.longitude != null)
    .filter((org) => matchesFilters(org, 'name'))
    .forEach((org) => {
      const isConsultationCenter = org.isConsultationCenter;
      if (isConsultationCenter && !showConsultationCenters.value) return;
      if (!isConsultationCenter && !showOrganizations.value) return;

      const color = isConsultationCenter ? '#c0392b' : '#d9b64c';
      const marker = L.circleMarker([org.latitude, org.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.8,
      });
      marker.bindPopup(
        `<strong>${org.name}</strong><br>` +
          `${org.category || ''}<br>` +
          `<a href="/organizations/${org._id}">View Details</a> | ` +
          `<a href="#" onclick="window.showMapDirections(${org.latitude}, ${org.longitude}); return false;">Directions</a>`
      );
      (isConsultationCenter ? consultLayer : orgLayer).addLayer(marker);
    });
}

// Gets the user's location, drops a marker for it, builds the nearby list,
// and (if given) runs onSuccess afterwards — used by showDirections() to
// get a location first when one isn't known yet.
function findNearby(onSuccess) {
  nearbyError.value = '';

  if (!navigator.geolocation) {
    nearbyError.value = 'Geolocation is not supported by your browser.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude };

      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([userLocation.value.lat, userLocation.value.lng], {
        radius: 10,
        color: '#1e88e5',
        fillColor: '#1e88e5',
        fillOpacity: 1,
      }).addTo(map);
      userMarker.bindPopup('You are here').openPopup();

      map.setView([userLocation.value.lat, userLocation.value.lng], 13);

      await updateNearbyList();
      if (onSuccess) onSuccess();
    },
    () => {
      nearbyError.value = 'Could not access your location. Please allow location access in your browser.';
    }
  );
}

// Asks OpenStreetMap's Nominatim service what area (e.g. "Mohammadpur") the
// given point is in. Returns empty strings if the lookup fails.
async function detectRegion(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const response = await fetch(url);
    const data = await response.json();
    const address = data.address || {};

    const name = address.suburb || address.neighbourhood || address.city_district || address.town || address.village || '';
    const broad = address.city || address.county || address.state_district || '';

    return { name: name || broad, broad };
  } catch (err) {
    return { name: '', broad: '' };
  }
}

// True if a location's own district/upazila text looks like the detected region.
function matchesRegion(item, region) {
  const name = region.name.toLowerCase();
  const broad = region.broad.toLowerCase();
  const upazila = item.upazila?.toLowerCase() || '';
  const district = item.district?.toLowerCase() || '';

  return (
    (upazila && (upazila.includes(name) || name.includes(upazila))) ||
    (district && (district.includes(name) || name.includes(district))) ||
    (broad && district && (district.includes(broad) || broad.includes(district)))
  );
}

// Builds the sidebar's "Nearby" list. Tries to match locations in the same
// area as the user (e.g. Mohammadpur); if the area can't be detected, or
// nothing in our data matches it, falls back to a plain 50 km radius.
async function updateNearbyList() {
  if (!userLocation.value) {
    nearbyList.value = [];
    nearbyRegion.value = '';
    return;
  }

  const { lat, lng } = userLocation.value;
  const region = await detectRegion(lat, lng);
  nearbyRegion.value = region.name;

  const items = [];

  allExperts
    .filter((expert) => expert.latitude != null && expert.longitude != null)
    .forEach((expert) => {
      items.push({
        type: 'Expert',
        name: expert.fullName,
        lat: expert.latitude,
        lng: expert.longitude,
        district: expert.district,
        upazila: expert.upazila,
        distanceKm: haversineDistanceKm(lat, lng, expert.latitude, expert.longitude),
      });
    });

  allOrganizations
    .filter((org) => org.latitude != null && org.longitude != null)
    .forEach((org) => {
      items.push({
        type: org.isConsultationCenter ? 'Consultation Center' : 'Organization',
        name: org.name,
        lat: org.latitude,
        lng: org.longitude,
        district: org.district,
        upazila: org.upazila,
        distanceKm: haversineDistanceKm(lat, lng, org.latitude, org.longitude),
      });
    });

  let matches = region.name ? items.filter((item) => matchesRegion(item, region)) : [];

  if (matches.length === 0) {
    nearbyRegion.value = ''; // nothing matched the detected area — show the radius label instead
    matches = items.filter((item) => item.distanceKm <= 50);
  }

  nearbyList.value = matches.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
}
</script>

<style scoped>
.map-nearby-list > div,
.map-search-results > div {
  padding: 8px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.map-nearby-list > div:hover,
.map-search-results > div:hover {
  background: var(--bg);
}
</style>
