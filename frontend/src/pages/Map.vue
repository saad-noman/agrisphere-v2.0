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

// Centres the map on a deep-linked location (?type=expert|org&id=...).
// The id is resolved against already-fetched data, never used directly.
function focusRequestedLocation() {
  const requestedType = route.query.type;
  const requestedId = route.query.id;

  if (!requestedType) return;
  if (!requestedId) return;

  let listToSearch = allOrganizations;
  if (requestedType === 'expert') {
    listToSearch = allExperts;
  }

  let target = null;
  for (let i = 0; i < listToSearch.length; i++) {
    if (listToSearch[i]._id === requestedId) {
      target = listToSearch[i];
      break;
    }
  }

  if (!target) return;
  if (target.latitude == null) return;
  if (target.longitude == null) return;

  let label = target.name;
  if (requestedType === 'expert') {
    label = target.fullName;
  }
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
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lng2 - lng1);

  const halfLatSinSquared = Math.pow(Math.sin(latitudeDifference / 2), 2);
  const halfLngSinSquared = Math.pow(Math.sin(longitudeDifference / 2), 2);

  const firstLatCos = Math.cos(toRadians(lat1));
  const secondLatCos = Math.cos(toRadians(lat2));

  const a = halfLatSinSquared + firstLatCos * secondLatCos * halfLngSinSquared;
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * centralAngle;
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

    if (data.code !== 'Ok') return null;
    if (!data.routes) return null;
    if (data.routes.length === 0) return null;

    const route = data.routes[0];

    // GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng].
    const path = [];
    for (let i = 0; i < route.geometry.coordinates.length; i++) {
      const longitude = route.geometry.coordinates[i][0];
      const latitude = route.geometry.coordinates[i][1];
      path.push([latitude, longitude]);
    }

    return {
      path,
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

  if (search) {
    const name = location[nameField];
    if (!name) return false;
    if (!name.toLowerCase().includes(search)) return false;
  }

  if (district) {
    if (!location.district) return false;
    if (!location.district.toLowerCase().includes(district)) return false;
  }

  if (upazila) {
    if (!location.upazila) return false;
    if (!location.upazila.toLowerCase().includes(upazila)) return false;
  }

  return true;
}

function renderMarkers() {
  expertLayer.clearLayers();
  orgLayer.clearLayers();
  consultLayer.clearLayers();

  if (showExperts.value) {
    for (let i = 0; i < allExperts.length; i++) {
      const expert = allExperts[i];

      if (expert.latitude == null) continue;
      if (expert.longitude == null) continue;
      if (!matchesFilters(expert, 'fullName')) continue;

      const marker = L.circleMarker([expert.latitude, expert.longitude], {
        radius: 8,
        color: '#2f6b3a',
        fillColor: '#2f6b3a',
        fillOpacity: 0.8,
      });

      const specialization = expert.specialization || '';
      const profileLink = `<a href="/experts/${expert._id}">View Profile</a>`;
      const directionsLink =
        `<a href="#" onclick="window.showMapDirections(${expert.latitude}, ${expert.longitude}); return false;">Directions</a>`;

      marker.bindPopup(
        `<strong>${expert.fullName}</strong><br>` +
          `${specialization}<br>` +
          `${profileLink} | ${directionsLink}`
      );

      expertLayer.addLayer(marker);
    }
  }

  for (let i = 0; i < allOrganizations.length; i++) {
    const org = allOrganizations[i];

    if (org.latitude == null) continue;
    if (org.longitude == null) continue;
    if (!matchesFilters(org, 'name')) continue;

    const isConsultationCenter = org.isConsultationCenter;

    if (isConsultationCenter && !showConsultationCenters.value) continue;
    if (!isConsultationCenter && !showOrganizations.value) continue;

    let color = '#d9b64c';
    if (isConsultationCenter) {
      color = '#c0392b';
    }

    const marker = L.circleMarker([org.latitude, org.longitude], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.8,
    });

    const category = org.category || '';
    const detailsLink = `<a href="/organizations/${org._id}">View Details</a>`;
    const directionsLink =
      `<a href="#" onclick="window.showMapDirections(${org.latitude}, ${org.longitude}); return false;">Directions</a>`;

    marker.bindPopup(
      `<strong>${org.name}</strong><br>` +
        `${category}<br>` +
        `${detailsLink} | ${directionsLink}`
    );

    if (isConsultationCenter) {
      consultLayer.addLayer(marker);
    } else {
      orgLayer.addLayer(marker);
    }
  }
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

    let name = '';
    if (address.suburb) name = address.suburb;
    else if (address.neighbourhood) name = address.neighbourhood;
    else if (address.city_district) name = address.city_district;
    else if (address.town) name = address.town;
    else if (address.village) name = address.village;

    let broad = '';
    if (address.city) broad = address.city;
    else if (address.county) broad = address.county;
    else if (address.state_district) broad = address.state_district;

    if (!name) name = broad;

    return { name, broad };
  } catch (err) {
    return { name: '', broad: '' };
  }
}

// True if a location's own district/upazila text looks like the detected region.
function matchesRegion(item, region) {
  const name = region.name.toLowerCase();
  const broad = region.broad.toLowerCase();

  let upazila = '';
  if (item.upazila) upazila = item.upazila.toLowerCase();

  let district = '';
  if (item.district) district = item.district.toLowerCase();

  if (upazila) {
    if (upazila.includes(name)) return true;
    if (name.includes(upazila)) return true;
  }

  if (district) {
    if (district.includes(name)) return true;
    if (name.includes(district)) return true;
  }

  if (broad && district) {
    if (district.includes(broad)) return true;
    if (broad.includes(district)) return true;
  }

  return false;
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

  const userLat = userLocation.value.lat;
  const userLng = userLocation.value.lng;

  const region = await detectRegion(userLat, userLng);
  nearbyRegion.value = region.name;

  const items = [];

  for (let i = 0; i < allExperts.length; i++) {
    const expert = allExperts[i];

    if (expert.latitude == null) continue;
    if (expert.longitude == null) continue;

    items.push({
      type: 'Expert',
      name: expert.fullName,
      lat: expert.latitude,
      lng: expert.longitude,
      district: expert.district,
      upazila: expert.upazila,
      distanceKm: haversineDistanceKm(userLat, userLng, expert.latitude, expert.longitude),
    });
  }

  for (let i = 0; i < allOrganizations.length; i++) {
    const org = allOrganizations[i];

    if (org.latitude == null) continue;
    if (org.longitude == null) continue;

    let type = 'Organization';
    if (org.isConsultationCenter) {
      type = 'Consultation Center';
    }

    items.push({
      type,
      name: org.name,
      lat: org.latitude,
      lng: org.longitude,
      district: org.district,
      upazila: org.upazila,
      distanceKm: haversineDistanceKm(userLat, userLng, org.latitude, org.longitude),
    });
  }

  // First try locations in the same detected area as the user.
  let matches = [];
  if (region.name) {
    for (let i = 0; i < items.length; i++) {
      if (matchesRegion(items[i], region)) {
        matches.push(items[i]);
      }
    }
  }

  // Nothing matched the area, so fall back to a plain 50 km radius.
  if (matches.length === 0) {
    nearbyRegion.value = '';
    matches = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].distanceKm <= 50) {
        matches.push(items[i]);
      }
    }
  }

  matches.sort(function (a, b) {
    return a.distanceKm - b.distanceKm;
  });

  nearbyList.value = matches.slice(0, 10);
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
