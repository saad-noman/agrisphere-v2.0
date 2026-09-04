<template>
  <div class="field-map-page container py-4">
    <div class="page-header">
      <h1>{{ t('fieldMap.title') }}</h1>
      <p>{{ t('fieldMap.subtitle') }}</p>
    </div>

    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div class="row g-3">
      <!-- Crop details on the left -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h2 class="h6 mb-3">{{ t('fieldMap.crops') }}</h2>

            <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
            <p v-else-if="crops.length === 0" class="empty-state">{{ t('fieldMap.noCrops') }}</p>

            <ul v-else class="list-group field-crop-list">
              <li
                v-for="crop in crops"
                :key="crop._id"
                class="list-group-item field-crop-item"
                :class="{ 'is-active': selected && selected._id === crop._id }"
                @click="select(crop)"
              >
                <div class="fw-bold">{{ crop.name || crop.cropType }}</div>
                <div class="text-muted small">{{ crop.cropType }}</div>
                <span v-if="hasBoundary(crop)" class="status-badge status-success">
                  {{ t('fieldMap.boundarySaved') }}
                </span>
                <span v-else class="status-badge status-neutral">{{ t('fieldMap.noBoundary') }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="selected" class="card mt-3">
          <div class="card-body">
            <h2 class="h6 mb-2">{{ selected.name || selected.cropType }}</h2>
            <ul class="field-facts">
              <li v-if="selected.area">
                <span>{{ t('fieldMap.area') }}</span>
                <strong>{{ selected.area }} {{ selected.areaUnit || 'acre' }}</strong>
              </li>
              <li v-if="selected.season">
                <span>{{ t('fieldMap.season') }}</span><strong>{{ selected.season }}</strong>
              </li>
              <li v-if="selected.plantingDate">
                <span>{{ t('fieldMap.planted') }}</span><strong>{{ shortDate(selected.plantingDate) }}</strong>
              </li>
              <li v-if="selected.status">
                <span>{{ t('fieldMap.status') }}</span><strong>{{ selected.status }}</strong>
              </li>
            </ul>
            <router-link to="/farm-records" class="btn-pill-outline btn-pill-sm mt-2">
              {{ t('fieldMap.openInRecords') }}
            </router-link>
          </div>
        </div>
      </div>

      <!-- Map on the right -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <div class="field-boundary-tools mb-2">
              <input v-model="searchQuery" type="search" class="form-control"
                :placeholder="t('crop.searchPlacePlaceholder')" @keyup.enter="searchPlace" />
              <button type="button" class="btn-pill-outline btn-pill-sm" :disabled="searching" @click="searchPlace">
                {{ searching ? '…' : t('crop.searchPlace') }}
              </button>
              <button type="button" class="btn-pill-secondary btn-pill-sm" :disabled="locating" @click="useMyLocation">
                {{ locating ? t('geo.locating') : t('geo.useMyLocation') }}
              </button>
              <button v-if="selected" type="button" class="btn-pill btn-pill-sm"
                :disabled="saving" @click="toggleEdit">
                {{ editing ? t('fieldMap.cancelEdit') : t('fieldMap.editBoundary') }}
              </button>
              <button v-if="editing" type="button" class="btn-pill btn-pill-sm"
                :disabled="saving" @click="saveBoundary">
                {{ saving ? t('account.saving') : t('fieldMap.saveBoundary') }}
              </button>
            </div>
            <p v-if="toolMessage" class="small text-muted mb-2">{{ toolMessage }}</p>
            <p v-if="locationError" class="error-text small mb-2">{{ locationError }}</p>
            <p v-if="editing" class="map-report-hint small mb-2">{{ t('fieldMap.editHint') }}</p>
            <p v-if="editArea" class="field-boundary-area mb-2">
              {{ t('crop.areaCalculated', { area: editArea, unit: selected?.areaUnit || 'acre' }) }}
            </p>

            <div ref="mapContainer" class="field-map-canvas"></div>
            <p v-if="!selected" class="small text-muted mt-2 mb-0">{{ t('fieldMap.selectCrop') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import * as turf from '@turf/turf';
import { t, d } from '../i18n';
import { getCrops, updateCrop } from '../services/cropService';
import { useGeolocation } from '../composables/useGeolocation';

const crops = ref([]);
const selected = ref(null);
const loading = ref(true);
const error = ref('');

const searchQuery = ref('');
const searching = ref(false);
const toolMessage = ref('');
const editing = ref(false);
const saving = ref(false);
const editArea = ref(null);
let lastGeocodeAt = 0;

// One geolocation implementation, shared with the draw component
const { locate, locating, locationError } = useGeolocation();

let drawnItems = null;
let drawControl = null;

const mapContainer = ref(null);
let map = null;
let boundaryLayer = null;

function hasBoundary(crop) {
  return Boolean(crop.geoBoundary && crop.geoBoundary.coordinates);
}

function shortDate(value) {
  try {
    return d(value);
  } catch (err) {
    return new Date(value).toLocaleDateString();
  }
}

function ensureMap() {
  if (map) return;

  map = L.map(mapContainer.value).setView([23.8103, 90.4125], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  boundaryLayer = L.layerGroup().addTo(map);
}

// Draws the saved polygon and zooms to it
function select(crop) {
  selected.value = crop;
  ensureMap();
  boundaryLayer.clearLayers();
  if (drawnItems) drawnItems.clearLayers();
  editArea.value = null;

  if (!hasBoundary(crop)) {
    toolMessage.value = t('fieldMap.noBoundary');
    return;
  }

  toolMessage.value = '';
  const ring = crop.geoBoundary.coordinates[0];
  if (!ring || ring.length < 4) return;

  // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
  const latLngs = [];
  for (let i = 0; i < ring.length; i++) latLngs.push([ring[i][1], ring[i][0]]);

  const polygon = L.polygon(latLngs, {
    color: '#2f6b3a',
    weight: 2,
    fillColor: '#4c9a5b',
    fillOpacity: 0.3,
  });

  boundaryLayer.addLayer(polygon);
  map.fitBounds(polygon.getBounds(), { padding: [24, 24] });
}

async function searchPlace() {
  const query = searchQuery.value.trim();
  if (!query) return;

  const now = Date.now();
  if (now - lastGeocodeAt < 500) return;
  lastGeocodeAt = now;

  ensureMap();
  searching.value = true;
  toolMessage.value = '';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('lookup failed');

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      toolMessage.value = t('crop.placeNotFound');
      return;
    }

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toolMessage.value = t('crop.placeNotFound');
      return;
    }

    map.setView([lat, lng], 16);
  } catch (err) {
    toolMessage.value = t('crop.placeSearchFailed');
  } finally {
    searching.value = false;
  }
}

// The current-position marker lives on its own, so it never disturbs the
// field boundary that is being viewed or edited.
async function useMyLocation() {
  ensureMap();
  toolMessage.value = '';
  await locate(map, { zoom: 17 });
}

function areaInUnit(squareMetres, unit) {
  if (unit === 'hectare') return squareMetres / 10000;
  if (unit === 'bigha') return squareMetres / 1337.8;
  if (unit === 'katha') return squareMetres / 66.89;
  return squareMetres / 4046.86;
}

function ringToPolygon(latLngs) {
  const ring = [];
  for (let i = 0; i < latLngs.length; i++) ring.push([latLngs[i].lng, latLngs[i].lat]);

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);

  return { type: 'Polygon', coordinates: [ring] };
}

function measure(polygon) {
  try {
    const squareMetres = turf.area(turf.polygon(polygon.coordinates));
    editArea.value = areaInUnit(squareMetres, selected.value?.areaUnit || 'acre').toFixed(2);
  } catch (err) {
    editArea.value = null;
  }
}

// Turns the currently shown boundary into an editable shape. The saved
// polygon is loaded into the editor, so the farmer edits rather than redraws.
function toggleEdit() {
  ensureMap();

  if (editing.value) {
    editing.value = false;
    if (drawControl) { map.removeControl(drawControl); drawControl = null; }
    select(selected.value);
    return;
  }

  editing.value = true;
  boundaryLayer.clearLayers();

  if (!drawnItems) {
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
  }
  drawnItems.clearLayers();

  if (hasBoundary(selected.value)) {
    const ring = selected.value.geoBoundary.coordinates[0];
    const latLngs = [];
    for (let i = 0; i < ring.length; i++) latLngs.push([ring[i][1], ring[i][0]]);

    const polygon = L.polygon(latLngs, { color: '#2f6b3a', fillColor: '#4c9a5b', fillOpacity: 0.3 });
    drawnItems.addLayer(polygon);
    map.fitBounds(polygon.getBounds(), { padding: [24, 24] });
    measure(ringToPolygon(polygon.getLatLngs()[0]));
  }

  drawControl = new L.Control.Draw({
    draw: {
      polygon: { allowIntersection: false, shapeOptions: { color: '#2f6b3a' } },
      polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
    },
    edit: { featureGroup: drawnItems, remove: true },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (event) => {
    drawnItems.clearLayers();
    drawnItems.addLayer(event.layer);
    measure(ringToPolygon(event.layer.getLatLngs()[0]));
  });
  map.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer((layer) => measure(ringToPolygon(layer.getLatLngs()[0])));
  });
}

// Saves back onto the same crop record, so editing never creates a duplicate.
async function saveBoundary() {
  if (!selected.value) return;

  const layers = drawnItems ? drawnItems.getLayers() : [];
  let polygon = null;

  if (layers.length > 0) {
    const latLngs = layers[0].getLatLngs()[0];
    if (!latLngs || latLngs.length < 3) {
      toolMessage.value = t('crop.needThreePoints');
      return;
    }
    polygon = ringToPolygon(latLngs);
  }

  saving.value = true;
  error.value = '';

  try {
    const payload = { geoBoundary: polygon };
    if (editArea.value) payload.area = Number(editArea.value);

    const { data } = await updateCrop(selected.value._id, payload);

    // Re-read from the server response so the UI shows what was stored
    const saved = data && data._id ? data : { ...selected.value, ...payload };
    const index = crops.value.findIndex((crop) => crop._id === saved._id);
    if (index !== -1) crops.value.splice(index, 1, saved);

    editing.value = false;
    if (drawControl) { map.removeControl(drawControl); drawControl = null; }
    select(saved);
    toolMessage.value = t('fieldMap.boundaryUpdated');
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.saveFailed');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  ensureMap();

  try {
    const { data } = await getCrops();
    crops.value = Array.isArray(data) ? data : [];

    // Open the first crop that actually has a boundary
    for (let i = 0; i < crops.value.length; i++) {
      if (hasBoundary(crops.value[i])) {
        select(crops.value[i]);
        break;
      }
    }
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (map) map.remove();
});
</script>
