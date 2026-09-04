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

            <label class="form-label mb-1">{{ t('auth.country') }}</label>
            <input v-model="filters.country" type="text" class="form-control mb-2" :placeholder="t('auth.country')" />

            <label class="form-label mb-1">{{ t('auth.division') }} / {{ t('auth.state') }}</label>
            <input v-model="filters.region" type="text" class="form-control mb-2" :placeholder="t('auth.division')" />

            <label class="form-label mb-1">District</label>
            <input v-model="filters.district" type="text" class="form-control mb-2" placeholder="District" />

            <label class="form-label mb-1">Upazila</label>
            <input v-model="filters.upazila" type="text" class="form-control mb-2" placeholder="Upazila" />

            <div class="d-flex gap-2 mt-2">
              <button type="button" class="btn-pill flex-fill" @click="showFilters = false">Apply</button>
              <button type="button" class="btn-pill-secondary flex-fill" @click="clearFilters">Clear</button>
            </div>

            <button type="button" class="btn-pill-outline w-100 mt-2" @click="searchExternalAddress">
              {{ t('map.searchAddress') }}
            </button>
            <p v-if="searchError" class="small text-muted mt-2 mb-0">{{ searchError }}</p>

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

        <button type="button" class="btn-pill-outline w-100 mb-2" @click="toggleReportMode">
          {{ reportMode ? t('hazard.cancel') : t('hazard.reportButton') }}
        </button>

        <p v-if="reportMode && !pendingHazard" class="map-report-hint small mb-2">
          {{ t('hazard.reportMode') }}
        </p>

        <div v-if="pendingHazard" class="map-filter-panel mb-2">
          <label class="form-label mb-1">{{ t('hazard.type') }}</label>
          <select v-model="hazardForm.type" class="form-control mb-2">
            <option v-for="option in HAZARD_TYPES" :key="option" :value="option">
              {{ t(`hazard.${option}`) }}
            </option>
          </select>

          <label class="form-label mb-1">{{ t('hazard.severity') }}</label>
          <div class="d-flex gap-2 mb-2">
            <label
              v-for="level in HAZARD_SEVERITIES"
              :key="level"
              class="hazard-severity-pill"
              :class="{ 'is-selected': hazardForm.severity === level }"
              :style="{ borderColor: SEVERITY_COLORS[level] }"
            >
              <input v-model="hazardForm.severity" type="radio" :value="level" class="d-none" />
              <span class="map-legend-dot" :style="{ background: SEVERITY_COLORS[level] }"></span>
              {{ t(`hazard.${level}`) }}
            </label>
          </div>

          <label class="form-label mb-1">{{ t('hazard.description') }}</label>
          <input v-model="hazardForm.description" type="text" maxlength="300" class="form-control mb-2" />

          <p v-if="hazardError" class="error-text small">{{ hazardError }}</p>

          <div class="d-flex gap-2">
            <button type="button" class="btn-pill flex-fill" :disabled="savingHazard" @click="submitHazard">
              {{ savingHazard ? '…' : t('hazard.submit') }}
            </button>
            <button type="button" class="btn-pill-secondary flex-fill" @click="cancelHazardReport">
              {{ t('hazard.cancel') }}
            </button>
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
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showHazards" @change="renderHazards" />
            <span class="map-legend-dot" style="background: #e67e22"></span> {{ t('hazard.legend') }}
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showListings" @change="renderListings" />
            <span class="map-legend-dot" style="background: var(--green)"></span> {{ t('map.listingsLayer') }}
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showHotspots" @change="toggleHotspots" />
            <span class="map-legend-dot" style="background: #c0392b"></span> {{ t('map.hotspotsLayer') }}
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showBoundaries" @change="renderCropBoundaries" />
            <span class="map-legend-dot" style="background: #4c9a5b"></span> {{ t('map.boundariesLayer') }}
          </label>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showRadar" @change="toggleRadar" />
            <span class="map-legend-dot" style="background: #2b6ca3"></span> {{ t('map.radarLayer') }}
          </label>
          <p v-if="radarError" class="error-text small mb-2">{{ radarError }}</p>
          <label class="d-flex align-items-center gap-2 mb-2">
            <input type="checkbox" v-model="showRoadSurface" @change="toggleRoadSurfaceLayer" />
            <span class="map-legend-dot" style="background: #8d6e63"></span>
            {{ t('map.roadSurfaceLayer') }}
          </label>
          <div v-if="showRoadSurface" class="road-surface-key">
            <span><span class="road-surface-sample road-surface-paved"></span> {{ t('map.paved') }}</span>
            <span><span class="road-surface-sample road-surface-unpaved"></span> {{ t('map.unpaved') }}</span>
          </div>
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
import { formatShortAddress } from '../utils/address';
import { t } from '../i18n';
import * as turf from '@turf/turf';
import { escapeHtml } from '../utils/html';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { authState } from '../stores/auth';
import { getListings } from '../services/listingService';
import { getDiseaseHotspots } from '../services/diseaseHotspotService';
import { getCrops } from '../services/cropService';
import {
  getRoadHazards,
  reportRoadHazard,
  confirmRoadHazard,
  resolveRoadHazard,
} from '../services/roadHazardService';

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

const filters = ref({ search: '', country: '', region: '', district: '', upazila: '' });

const HAZARD_TYPES = ['waterlogged', 'flooded', 'blocked', 'damaged', 'construction', 'other'];
const HAZARD_SEVERITIES = ['low', 'medium', 'high'];
const SEVERITY_COLORS = { low: '#f1c40f', medium: '#e67e22', high: '#c0392b' };

const showHazards = ref(true);
const reportMode = ref(false);
const pendingHazard = ref(null);
const savingHazard = ref(false);
const hazardError = ref('');
const hazardForm = ref({ type: 'waterlogged', severity: 'medium', description: '' });

let hazards = [];
let hazardLayer = null;
let pendingHazardMarker = null;

// Extra map layers added in P1/P2
const showListings = ref(true);
const showHotspots = ref(false);
const showRadar = ref(false);
const showRoadSurface = ref(false);
const showBoundaries = ref(true);
const radarError = ref('');
const searchError = ref('');

let listingLayer = null;
let cropBoundaryLayer = null;
let heatLayer = null;
let radarLayer = null;
let osmStandardLayer = null;
let hotosmLayer = null;
let radarMeta = null;
let externalMarker = null;
let listings = [];
let hotspots = [];
let cropBoundaries = [];

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

// OpenStreetMap serves tiles up to zoom 19; asking for 20+ returns HTTP 400,
// so the map is clamped to what the tile provider actually supports.
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

// The full, unfiltered dataset — fetched once. Filters only ever change what
// is rendered from this list, they never discard data, so clearing a filter
// always brings everything back without a fresh request.
let allExperts = [];
let allOrganizations = [];

onMounted(async () => {
  map = L.map(mapContainer.value, {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  }).setView([defaultLat, defaultLng], defaultZoom);

  // Leaflet's TileLayer default caps at zoom 18, one level short of what
  // OpenStreetMap actually serves, so the last zoom step is set explicitly.
  // Two base styles, only one on the map at a time. The humanitarian (HOT)
  // style renders unpaved roads and tracks distinctly, which matters when
  // planning a delivery route in rural areas.
  osmStandardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });

  hotosmLayer = L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors, Tiles courtesy of HOT',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });

  osmStandardLayer.addTo(map);

  // Cluster groups keep pins readable as the data grows. Each layer stays
  // separate so its legend toggle still controls only its own markers.
  expertLayer = L.markerClusterGroup();
  orgLayer = L.markerClusterGroup();
  consultLayer = L.markerClusterGroup();
  hazardLayer = L.markerClusterGroup();
  listingLayer = L.markerClusterGroup();

  map.addLayer(expertLayer);
  map.addLayer(orgLayer);
  map.addLayer(consultLayer);
  map.addLayer(hazardLayer);
  map.addLayer(listingLayer);

  cropBoundaryLayer = L.layerGroup().addTo(map);

  // Tapping the map in report mode places the hazard being reported
  map.on('click', handleMapClick);

  // The map fills its container via CSS; make sure Leaflet re-measures it
  // whenever the window is resized (e.g. rotating a phone).
  window.addEventListener('resize', handleWindowResize);

  // Marker popups are plain HTML strings (Leaflet doesn't render Vue inside
  // them), so the "Directions" link inside a popup calls this global bridge
  // to reach our in-app showDirections() function.
  window.showMapDirections = showDirections;
  window.confirmMapHazard = confirmHazardById;
  window.resolveMapHazard = resolveHazardById;

  const expertResponse = await searchExperts();
  allExperts = expertResponse.data;

  const orgResponse = await searchOrganizations();
  allOrganizations = orgResponse.data;

  renderMarkers();
  focusRequestedLocation();
  await loadHazards();
  await loadListings();
  await loadCropBoundaries();
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
  focusMarker.bindPopup(`<strong>${escapeHtml(label)}</strong>`).openPopup();
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  delete window.showMapDirections;
  delete window.confirmMapHazard;
  delete window.resolveMapHazard;
  if (map) map.remove();
});

function handleWindowResize() {
  if (map) map.invalidateSize();
}

// Re-render whenever a filter changes, so results update as you type.
watch(filters, renderMarkers, { deep: true });

function clearFilters() {
  filters.value = { search: '', country: '', region: '', district: '', upazila: '' };
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

// Asks OSRM (OpenStreetMap's routing service) for driving routes, requesting
// alternatives so a hazard-free option can be picked. Returns null if the
// request fails, so the caller can fall back gracefully.
async function fetchFastestRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') return null;
    if (!data.routes) return null;
    if (data.routes.length === 0) return null;

    // GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng].
    const candidates = [];
    for (let r = 0; r < data.routes.length; r++) {
      const route = data.routes[r];
      const path = [];

      for (let i = 0; i < route.geometry.coordinates.length; i++) {
        const longitude = route.geometry.coordinates[i][0];
        const latitude = route.geometry.coordinates[i][1];
        path.push([latitude, longitude]);
      }

      candidates.push({
        path,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      });
    }

    return chooseSafestRoute(candidates);
  } catch (err) {
    return null;
  }
}

// Prefers the quickest route that avoids every reported hazard. If they all
// pass one, the least-affected route is used and the caller warns the user.
function chooseSafestRoute(candidates) {
  const evaluated = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const hazardsOnRoute = findHazardsOnRoute(candidate.path);

    evaluated.push({
      ...candidate,
      hazardsOnRoute,
      hazardScore: scoreHazards(hazardsOnRoute),
    });
  }

  // Quickest first, so ties fall back to travel time
  evaluated.sort(function (a, b) {
    return a.durationMin - b.durationMin;
  });

  let clear = null;
  for (let i = 0; i < evaluated.length; i++) {
    if (evaluated[i].hazardsOnRoute.length === 0) {
      clear = evaluated[i];
      break;
    }
  }

  if (clear) {
    // Only say the route was adjusted if a worse option really was skipped
    const quickest = evaluated[0];
    clear.avoidedHazards = [];
    if (quickest !== clear && quickest.hazardsOnRoute.length > 0) {
      clear.avoidedHazards = quickest.hazardsOnRoute;
    }
    return clear;
  }

  let leastAffected = evaluated[0];
  for (let i = 1; i < evaluated.length; i++) {
    if (evaluated[i].hazardScore < leastAffected.hazardScore) {
      leastAffected = evaluated[i];
    }
  }

  leastAffected.avoidedHazards = [];
  return leastAffected;
}

async function drawDirectionsLine(destLat, destLng) {
  if (directionsLine) map.removeLayer(directionsLine);

  const from = { lat: userLocation.value.lat, lng: userLocation.value.lng };
  const to = { lat: destLat, lng: destLng };
  const route = await fetchFastestRoute(from, to);

  if (route) {
    directionsLine = L.polyline(route.path, { color: '#1e88e5', weight: 5 }).addTo(map);

    let popupText = `Fastest route: ${escapeHtml(route.distanceKm.toFixed(1))} km, about ${Math.round(route.durationMin)} min`;

    const avoided = route.avoidedHazards || [];
    const onRoute = route.hazardsOnRoute || [];

    if (avoided.length > 0) {
      const typeLabel = t(`hazard.${avoided[0].type}`);
      popupText +=
        `<br><span class="hazard-route-note">` +
        escapeHtml(t('hazard.routeAdjusted', { count: avoided.length, type: typeLabel })) +
        `</span>`;
    } else if (onRoute.length > 0) {
      const typeLabel = t(`hazard.${onRoute[0].type}`);
      const severityLabel = t(`hazard.${onRoute[0].severity}`);
      popupText +=
        `<br><span class="hazard-route-warning">⚠ ` +
        escapeHtml(t('hazard.routeWarning', { type: typeLabel, severity: severityLabel })) +
        `</span>`;
    }

    directionsLine.bindPopup(popupText).openPopup();
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
  const country = filters.value.country.trim().toLowerCase();
  const region = filters.value.region.trim().toLowerCase();
  const district = filters.value.district.trim().toLowerCase();
  const upazila = filters.value.upazila.trim().toLowerCase();

  const address = location.address || {};

  if (search) {
    const name = location[nameField];
    if (!name) return false;
    if (!name.toLowerCase().includes(search)) return false;
  }

  if (country) {
    if (!address.country) return false;
    if (!address.country.toLowerCase().includes(country)) return false;
  }

  // One box matches either a Bangladeshi division or a foreign state
  if (region) {
    const divisionOrState = address.division || address.state;
    if (!divisionOrState) return false;
    if (!divisionOrState.toLowerCase().includes(region)) return false;
  }

  if (district) {
    if (!address.district) return false;
    if (!address.district.toLowerCase().includes(district)) return false;
  }

  if (upazila) {
    if (!address.upazila) return false;
    if (!address.upazila.toLowerCase().includes(upazila)) return false;
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

      const marker = L.marker([expert.latitude, expert.longitude], {
        icon: buildDotIcon('#2f6b3a'),
      });

      // Leaflet renders popup content as raw HTML, so every user-editable
      // value is escaped before it goes in.
      const expertName = escapeHtml(expert.fullName);
      const specialization = escapeHtml(expert.specialization || '');
      const expertPlace = escapeHtml(formatShortAddress(expert.address));
      const profileLink = `<a href="/experts/${encodeURIComponent(expert._id)}">View Profile</a>`;
      const directionsLink =
        `<a href="#" onclick="window.showMapDirections(${expert.latitude}, ${expert.longitude}); return false;">Directions</a>`;

      marker.bindPopup(
        `<strong>${expertName}</strong><br>` +
          `${specialization}<br>` +
          (expertPlace ? `${expertPlace}<br>` : '') +
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

    const marker = L.marker([org.latitude, org.longitude], { icon: buildDotIcon(color) });

    const orgName = escapeHtml(org.name);
    const category = escapeHtml(org.category || '');
    const orgPlace = escapeHtml(formatShortAddress(org.address));
    const detailsLink = `<a href="/organizations/${encodeURIComponent(org._id)}">View Details</a>`;
    const directionsLink =
      `<a href="#" onclick="window.showMapDirections(${org.latitude}, ${org.longitude}); return false;">Directions</a>`;

    marker.bindPopup(
      `<strong>${orgName}</strong><br>` +
        `${category}<br>` +
        (orgPlace ? `${orgPlace}<br>` : '') +
        `${detailsLink} | ${directionsLink}`
    );

    if (isConsultationCenter) {
      consultLayer.addLayer(marker);
    } else {
      orgLayer.addLayer(marker);
    }
  }
}

// Small round marker so clustered pins keep the original colour coding
function buildDotIcon(color) {
  const html =
    `<span style="display:block;width:16px;height:16px;border-radius:50%;` +
    `background:${color};border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></span>`;

  return L.divIcon({ html, className: 'map-dot-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
}

// ---------------------------------------------------------------------------
// Marketplace listings on the map
// ---------------------------------------------------------------------------
async function loadListings() {
  try {
    const response = await getListings();
    listings = response.data || [];
  } catch (err) {
    listings = [];
  }

  renderListings();
}

function buildLeafIcon() {
  const html =
    `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">` +
    `<path d="M5 19c0-8 6-14 14-14 0 9-6 15-14 14Z" fill="#2f6b3a" stroke="#ffffff" stroke-width="1.4"/>` +
    `</svg>`;

  return L.divIcon({ html, className: 'listing-marker', iconSize: [24, 24], iconAnchor: [12, 18] });
}

function renderListings() {
  if (!listingLayer) return;

  listingLayer.clearLayers();
  if (!showListings.value) return;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    if (listing.latitude == null || listing.longitude == null) continue;

    const marker = L.marker([listing.latitude, listing.longitude], { icon: buildLeafIcon() });

    const crop = escapeHtml(listing.cropType);
    const priceLine = escapeHtml(`${listing.quantity} ${listing.unit} · ${listing.price} ${listing.currency}`);
    const place = escapeHtml(formatShortAddress(listing.address));

    marker.bindPopup(
      `<strong>${crop}</strong><br>${priceLine}<br>` +
        (place ? `${place}<br>` : '') +
        `<a href="/marketplace">${escapeHtml(t('marketplace.title'))}</a>`
    );

    listingLayer.addLayer(marker);
  }
}

// ---------------------------------------------------------------------------
// Disease hotspots (density of recent reports, by district)
// ---------------------------------------------------------------------------
async function loadHotspots() {
  try {
    const response = await getDiseaseHotspots();
    hotspots = response.data?.hotspots || [];
  } catch (err) {
    hotspots = [];
  }

  renderHotspots();
}

function renderHotspots() {
  if (!map) return;

  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }

  if (!showHotspots.value) return;
  if (hotspots.length === 0) return;

  let maxCount = 1;
  for (let i = 0; i < hotspots.length; i++) {
    if (hotspots[i].count > maxCount) maxCount = hotspots[i].count;
  }

  const points = [];
  for (let i = 0; i < hotspots.length; i++) {
    const hotspot = hotspots[i];
    points.push([hotspot.latitude, hotspot.longitude, hotspot.count / maxCount]);
  }

  // leaflet.heat scales intensity down by 2^(maxZoom - currentZoom), so a
  // maxZoom above the zoom farmers actually start at leaves the hotspots almost
  // invisible. Tying it to the default view keeps them at full strength there
  // and on every zoom level further in.
  heatLayer = L.heatLayer(points, {
    radius: 35,
    blur: 25,
    maxZoom: defaultZoom,
    gradient: { 0.3: '#f6d365', 0.6: '#e67e22', 1: '#c0392b' },
  }).addTo(map);
}

async function toggleHotspots() {
  if (showHotspots.value && hotspots.length === 0) {
    await loadHotspots();
    return;
  }

  renderHotspots();
}

// ---------------------------------------------------------------------------
// Saved crop field boundaries
// ---------------------------------------------------------------------------
async function loadCropBoundaries() {
  if (!authState.user) return;

  try {
    const response = await getCrops();
    cropBoundaries = [];

    const crops = response.data || [];
    for (let i = 0; i < crops.length; i++) {
      const crop = crops[i];
      if (!crop.geoBoundary) continue;
      if (!crop.geoBoundary.coordinates) continue;
      cropBoundaries.push(crop);
    }
  } catch (err) {
    cropBoundaries = [];
  }

  renderCropBoundaries();
}

function renderCropBoundaries() {
  if (!cropBoundaryLayer) return;

  cropBoundaryLayer.clearLayers();
  if (!showBoundaries.value) return;

  for (let i = 0; i < cropBoundaries.length; i++) {
    const crop = cropBoundaries[i];
    const ring = crop.geoBoundary.coordinates[0];
    if (!ring || ring.length < 4) continue;

    // GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]
    const latLngs = [];
    for (let j = 0; j < ring.length; j++) {
      latLngs.push([ring[j][1], ring[j][0]]);
    }

    const polygon = L.polygon(latLngs, {
      color: '#2f6b3a',
      weight: 2,
      fillColor: '#4c9a5b',
      fillOpacity: 0.25,
    });

    const name = escapeHtml(crop.name || crop.cropType || '');
    let areaLine = '';
    if (crop.area) {
      areaLine = `<br>${escapeHtml(`${crop.area} ${crop.areaUnit || 'acre'}`)}`;
    }

    polygon.bindPopup(`<strong>${name}</strong>${areaLine}`);
    cropBoundaryLayer.addLayer(polygon);
  }
}

// ---------------------------------------------------------------------------
// Rain radar (RainViewer public API, no key)
// ---------------------------------------------------------------------------
async function toggleRadar() {
  radarError.value = '';

  if (!showRadar.value) {
    removeRadar();
    return;
  }

  try {
    // Metadata is cached for the session so repeated toggling is cheap
    if (!radarMeta) {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!response.ok) throw new Error('radar unavailable');
      radarMeta = await response.json();
    }

    const frames = radarMeta?.radar?.past || [];
    if (frames.length === 0) throw new Error('no radar frames');

    const latest = frames[frames.length - 1];
    const host = radarMeta.host || 'https://tilecache.rainviewer.com';

    removeRadar();
    // Without an explicit maxZoom this overlay would keep Leaflet's default of
    // 18 and silently disappear at the map's closest zoom level.
    radarLayer = L.tileLayer(`${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
      opacity: 0.55,
      attribution: 'RainViewer',
      minZoom: MIN_ZOOM,
      // The map keeps its full zoom range; RainViewer only publishes tiles up
      // to about z12, so beyond that the last real tile is scaled up instead
      // of the layer going blank and the map appearing stuck.
      maxZoom: MAX_ZOOM,
      maxNativeZoom: 12,
    });
    radarLayer.addTo(map);
  } catch (err) {
    // Radar is optional; the map stays usable without it
    showRadar.value = false;
    removeRadar();
    radarError.value = t('map.radarUnavailable');
  }
}

// Swaps the base map between the standard OSM style and the humanitarian
// style that distinguishes unpaved roads. If the HOT tile server is
// unreachable Leaflet just shows empty tiles, so no error state is needed.
function toggleRoadSurfaceLayer() {
  if (!map) return;

  if (showRoadSurface.value) {
    if (osmStandardLayer) map.removeLayer(osmStandardLayer);
    if (hotosmLayer) hotosmLayer.addTo(map);
  } else {
    if (hotosmLayer) map.removeLayer(hotosmLayer);
    if (osmStandardLayer) osmStandardLayer.addTo(map);
  }
}

function removeRadar() {
  if (radarLayer && map) {
    map.removeLayer(radarLayer);
  }
  radarLayer = null;
}

// ---------------------------------------------------------------------------
// Address search fallback (Nominatim) — only when nothing matches locally
// ---------------------------------------------------------------------------
async function searchExternalAddress() {
  searchError.value = '';

  const term = filters.value.search.trim();
  if (!term) return;

  // A local match already answers the question, so no external call is made
  if (searchResults.value.length > 0) {
    searchError.value = t('map.showingLocalResults');
    return;
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) throw new Error('lookup failed');

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      searchError.value = t('map.addressNotFound');
      return;
    }

    const place = results[0];
    const lat = Number(place.lat);
    const lng = Number(place.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      searchError.value = t('map.addressNotFound');
      return;
    }

    map.setView([lat, lng], 13);

    if (externalMarker) map.removeLayer(externalMarker);
    externalMarker = L.marker([lat, lng]).addTo(map);
    externalMarker.bindPopup(`<strong>${escapeHtml(place.display_name || term)}</strong>`).openPopup();
  } catch (err) {
    searchError.value = t('map.externalSearchFailed');
  }
}

// ---------------------------------------------------------------------------
// Road condition reports (community-reported, not live traffic data)
// ---------------------------------------------------------------------------

// Loads the active hazards and draws them on the map
async function loadHazards() {
  try {
    const response = await getRoadHazards();
    hazards = response.data || [];
  } catch (err) {
    // The map still works without hazard data
    hazards = [];
  }

  renderHazards();
}

// Builds a triangular warning icon coloured by severity
function buildHazardIcon(severity) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

  const html =
    `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">` +
    `<path d="M12 3 L22 20 L2 20 Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M12 9 v5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="12" cy="17" r="1.1" fill="#ffffff"/>` +
    `</svg>`;

  return L.divIcon({
    html,
    className: 'hazard-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 20],
  });
}

// Turns a report time into "Reported N hours ago"
function describeReportedAt(createdAt) {
  const reported = new Date(createdAt);
  if (Number.isNaN(reported.getTime())) return '';

  const hours = Math.floor((Date.now() - reported.getTime()) / 3600000);
  if (hours < 1) return t('hazard.reportedRecently');

  return t('hazard.reportedAgo', { hours });
}

function renderHazards() {
  if (!hazardLayer) return;

  hazardLayer.clearLayers();
  if (!showHazards.value) return;

  for (let i = 0; i < hazards.length; i++) {
    const hazard = hazards[i];

    const marker = L.marker([hazard.latitude, hazard.longitude], {
      icon: buildHazardIcon(hazard.severity),
    });

    // Everything user-supplied is escaped before it reaches the popup HTML
    const typeLabel = escapeHtml(t(`hazard.${hazard.type}`));
    const severityLabel = escapeHtml(t(`hazard.${hazard.severity}`));
    const description = escapeHtml(hazard.description || '');
    const reportedAt = escapeHtml(describeReportedAt(hazard.createdAt));
    const hazardId = encodeURIComponent(hazard._id);

    let confirmLine = '';
    if (hazard.confirmationCount > 0) {
      confirmLine = `<div>✓ ${escapeHtml(t('hazard.confirmedBy', { count: hazard.confirmationCount }))}</div>`;
    }

    let confirmButton = '';
    if (!hazard.confirmedByMe) {
      confirmButton =
        `<a href="#" onclick="window.confirmMapHazard('${hazardId}'); return false;">${escapeHtml(t('hazard.confirm'))}</a>`;
    }

    let resolveButton = '';
    if (hazard.canResolve) {
      const separator = confirmButton ? ' | ' : '';
      resolveButton =
        `${separator}<a href="#" onclick="window.resolveMapHazard('${hazardId}'); return false;">${escapeHtml(t('hazard.markResolved'))}</a>`;
    }

    marker.bindPopup(
      `<strong>${typeLabel}</strong> (${severityLabel})<br>` +
        (description ? `${description}<br>` : '') +
        `<span class="text-muted">${reportedAt}</span><br>` +
        confirmLine +
        `${confirmButton}${resolveButton}`
    );

    hazardLayer.addLayer(marker);
  }
}

function toggleReportMode() {
  reportMode.value = !reportMode.value;

  if (!reportMode.value) {
    cancelHazardReport();
  }
}

// In report mode, a tap on the map marks where the problem is
function handleMapClick(event) {
  if (!reportMode.value) return;

  hazardError.value = '';
  pendingHazard.value = { lat: event.latlng.lat, lng: event.latlng.lng };

  if (pendingHazardMarker) map.removeLayer(pendingHazardMarker);
  pendingHazardMarker = L.marker([event.latlng.lat, event.latlng.lng], {
    icon: buildHazardIcon(hazardForm.value.severity),
  }).addTo(map);
}

function cancelHazardReport() {
  pendingHazard.value = null;
  hazardError.value = '';
  hazardForm.value = { type: 'waterlogged', severity: 'medium', description: '' };

  if (pendingHazardMarker) {
    map.removeLayer(pendingHazardMarker);
    pendingHazardMarker = null;
  }
}

async function submitHazard() {
  if (!pendingHazard.value) return;

  savingHazard.value = true;
  hazardError.value = '';

  try {
    await reportRoadHazard({
      type: hazardForm.value.type,
      severity: hazardForm.value.severity,
      description: hazardForm.value.description,
      latitude: pendingHazard.value.lat,
      longitude: pendingHazard.value.lng,
    });

    reportMode.value = false;
    cancelHazardReport();
    await loadHazards();
  } catch (err) {
    hazardError.value = err.response?.data?.message || t('hazard.failed');
  } finally {
    savingHazard.value = false;
  }
}

async function confirmHazardById(id) {
  try {
    await confirmRoadHazard(id);
    await loadHazards();
  } catch (err) {
    // Leave the existing markers in place if the update fails
  }
}

async function resolveHazardById(id) {
  try {
    await resolveRoadHazard(id);
    await loadHazards();
  } catch (err) {
    // Leave the existing markers in place if the update fails
  }
}

// Returns the active hazards whose ~200m buffer the given route passes through
function findHazardsOnRoute(path) {
  if (!path || path.length < 2) return [];
  if (hazards.length === 0) return [];

  try {
    // turf works in [lng, lat]; our path is [lat, lng]
    const coordinates = [];
    for (let i = 0; i < path.length; i++) {
      coordinates.push([path[i][1], path[i][0]]);
    }

    const routeLine = turf.lineString(coordinates);
    const hit = [];

    for (let i = 0; i < hazards.length; i++) {
      const hazard = hazards[i];
      const buffer = turf.buffer(turf.point([hazard.longitude, hazard.latitude]), 0.2, {
        units: 'kilometers',
      });

      if (buffer && turf.booleanIntersects(routeLine, buffer)) {
        hit.push(hazard);
      }
    }

    return hit;
  } catch (err) {
    // If the geometry check fails, treat the route as unblocked
    return [];
  }
}

const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 };

// Scores how badly a route is affected, so the least-bad one can be chosen
function scoreHazards(hazardsOnRoute) {
  let score = 0;

  for (let i = 0; i < hazardsOnRoute.length; i++) {
    score += SEVERITY_WEIGHT[hazardsOnRoute[i].severity] || 2;
  }

  return score;
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
      district: expert.address?.district,
      upazila: expert.address?.upazila,
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
      district: org.address?.district,
      upazila: org.address?.upazila,
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
