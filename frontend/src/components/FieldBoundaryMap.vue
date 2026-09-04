<template>
  <div class="field-boundary">
    <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
      <label class="form-label mb-0">{{ t('crop.fieldBoundary') }}</label>
      <div class="d-flex gap-2">
        <button type="button" class="btn-pill-outline btn-pill-sm" @click="toggleMap">
          {{ open ? t('crop.hideMap') : t('crop.drawBoundary') }}
        </button>
        <button
          v-if="hasBoundary"
          type="button"
          class="btn-pill-danger btn-pill-sm"
          @click="clearBoundary"
        >
          {{ t('crop.clearBoundary') }}
        </button>
      </div>
    </div>

    <div v-show="open">
      <p class="small text-muted mb-2">{{ t('crop.drawHint') }}</p>

      <div class="field-boundary-tools mb-2">
        <input
          v-model="searchQuery"
          type="search"
          class="form-control"
          :placeholder="t('crop.searchPlacePlaceholder')"
          @keyup.enter="searchPlace"
        />
        <button type="button" class="btn-pill-outline btn-pill-sm" :disabled="searching" @click="searchPlace">
          {{ searching ? '…' : t('crop.searchPlace') }}
        </button>
        <button type="button" class="btn-pill-secondary btn-pill-sm" :disabled="locating" @click="useMyLocation">
          {{ locating ? t('geo.locating') : t('geo.useMyLocation') }}
        </button>
      </div>
      <p v-if="toolMessage" class="small text-muted mb-2">{{ toolMessage }}</p>

      <div ref="mapContainer" class="field-boundary-map"></div>
      <p v-if="computedArea" class="field-boundary-area mt-2 mb-0">
        {{ t('crop.areaCalculated', { area: computedArea, unit: areaUnit }) }}
      </p>
      <p v-if="boundaryError" class="error-text small mt-2 mb-0">{{ boundaryError }}</p>
      <p v-if="locationError" class="error-text small mt-2 mb-0">{{ locationError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import * as turf from '@turf/turf';
import { t } from '../i18n';
import { useGeolocation } from '../composables/useGeolocation';

// leaflet-draw 1.0.4 ships a readableArea that assigns to an undeclared `type`.
// That is a silent global in a plain <script>, but this file is an ES module, so
// it would throw a ReferenceError the moment any draw option asks for an area
// readout. Replacing it with a correctly scoped version keeps the tool safe to
// extend later (e.g. turning on showArea) instead of failing at runtime.
L.GeometryUtil.readableArea = function readableArea(area, isMetric, precision) {
  const prec = L.Util.extend({}, { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0 }, precision);
  let areaStr;

  if (isMetric) {
    let units = ['ha', 'm'];
    const type = typeof isMetric;
    if (type === 'string') units = [isMetric];
    else if (type !== 'boolean') units = isMetric;

    if (area >= 1000000 && units.indexOf('km') !== -1) {
      areaStr = `${L.GeometryUtil.formattedNumber(area * 0.000001, prec.km)} km²`;
    } else if (area >= 10000 && units.indexOf('ha') !== -1) {
      areaStr = `${L.GeometryUtil.formattedNumber(area * 0.0001, prec.ha)} ha`;
    } else {
      areaStr = `${L.GeometryUtil.formattedNumber(area, prec.m)} m²`;
    }
  } else {
    const yards = area / 0.836127; // square yards in one square metre

    if (yards >= 3097600) {
      areaStr = `${L.GeometryUtil.formattedNumber(yards / 3097600, prec.mi)} mi²`;
    } else if (yards >= 4840) {
      areaStr = `${L.GeometryUtil.formattedNumber(yards / 4840, prec.ac)} acres`;
    } else {
      areaStr = `${L.GeometryUtil.formattedNumber(yards, prec.yd)} yd²`;
    }
  }

  return areaStr;
};

const props = defineProps({
  boundary: { type: Object, default: null },
  areaUnit: { type: String, default: 'acre' },
});

const emit = defineEmits(['update:boundary', 'update:area']);

const open = ref(false);
const mapContainer = ref(null);
const boundaryError = ref('');
const searchQuery = ref('');
const searching = ref(false);
const toolMessage = ref('');

// Same geolocation behaviour as the other maps
const { locate, locating, locationError } = useGeolocation();
let lastGeocodeAt = 0;
const computedArea = ref(null);

let map = null;
let drawnItems = null;
let drawControl = null;

const hasBoundary = computed(() => Boolean(props.boundary && props.boundary.coordinates));

// Square metres -> the unit the farmer is already using for this crop
function convertArea(squareMetres) {
  if (props.areaUnit === 'hectare') return squareMetres / 10000;
  if (props.areaUnit === 'bigha') return squareMetres / 1337.8;
  if (props.areaUnit === 'katha') return squareMetres / 66.89;
  // Default: acres
  return squareMetres / 4046.86;
}

// Leaflet gives [lat, lng]; GeoJSON needs [lng, lat] and a closed ring
function toGeoJsonPolygon(latLngs) {
  const ring = [];

  for (let i = 0; i < latLngs.length; i++) {
    ring.push([latLngs[i].lng, latLngs[i].lat]);
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  return { type: 'Polygon', coordinates: [ring] };
}

function applyPolygon(layer) {
  const latLngs = layer.getLatLngs()[0];

  // A polygon needs at least three distinct corners to enclose any area
  if (!latLngs || latLngs.length < 3) {
    boundaryError.value = t('crop.needThreePoints');
    return;
  }

  const polygon = toGeoJsonPolygon(latLngs);

  try {
    const squareMetres = turf.area(turf.polygon(polygon.coordinates));
    const converted = convertArea(squareMetres);
    computedArea.value = converted.toFixed(2);

    boundaryError.value = '';
    emit('update:boundary', polygon);
    emit('update:area', Number(converted.toFixed(2)));
  } catch (err) {
    boundaryError.value = t('crop.invalidBoundary');
  }
}

function drawExistingBoundary() {
  if (!drawnItems) return;
  drawnItems.clearLayers();

  if (!hasBoundary.value) return;

  const ring = props.boundary.coordinates[0];
  if (!ring || ring.length < 4) return;

  const latLngs = [];
  for (let i = 0; i < ring.length; i++) {
    latLngs.push([ring[i][1], ring[i][0]]);
  }

  const polygon = L.polygon(latLngs, { color: '#2f6b3a', fillColor: '#4c9a5b', fillOpacity: 0.3 });
  drawnItems.addLayer(polygon);
  map.fitBounds(polygon.getBounds(), { padding: [20, 20] });

  try {
    const squareMetres = turf.area(turf.polygon(props.boundary.coordinates));
    computedArea.value = convertArea(squareMetres).toFixed(2);
  } catch (err) {
    computedArea.value = null;
  }
}

async function toggleMap() {
  open.value = !open.value;
  if (!open.value) return;

  await nextTick();
  if (map) {
    map.invalidateSize();
    return;
  }

  // Tracing a field edge needs the closest zoom OpenStreetMap offers (19);
  // Leaflet's default TileLayer cap of 18 stops a level short of that.
  map = L.map(mapContainer.value, { minZoom: 3, maxZoom: 19 })
    .setView([23.8103, 90.4125], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: 3,
    maxZoom: 19,
  }).addTo(map);

  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Only the polygon tool is offered, since that is all a field needs
  drawControl = new L.Control.Draw({
    draw: {
      polygon: { allowIntersection: false, shapeOptions: { color: '#2f6b3a' } },
      polyline: false,
      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false,
    },
    edit: { featureGroup: drawnItems, remove: true },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (event) => {
    // One boundary per crop, so a new drawing replaces the previous one
    drawnItems.clearLayers();
    drawnItems.addLayer(event.layer);
    applyPolygon(event.layer);
  });

  map.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer((layer) => applyPolygon(layer));
  });

  map.on(L.Draw.Event.DELETED, () => {
    clearBoundary();
  });

  drawExistingBoundary();
}

// Geocodes the typed place with Nominatim and pans the draw map there.
// Throttled so a burst of clicks cannot hammer the public service.
async function searchPlace() {
  const query = searchQuery.value.trim();
  if (!query || !map) return;

  const now = Date.now();
  if (now - lastGeocodeAt < 500) return;
  lastGeocodeAt = now;

  searching.value = true;
  toolMessage.value = '';

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
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

// Drops a current-position marker and centres on it. The drawn boundary is
// a separate layer, so locating never clears the farmer's polygon.
async function useMyLocation() {
  if (!map) return;
  toolMessage.value = '';
  await locate(map, { zoom: 17 });
}

function clearBoundary() {
  if (drawnItems) drawnItems.clearLayers();
  computedArea.value = null;
  boundaryError.value = '';
  emit('update:boundary', null);
}

watch(() => props.boundary, () => {
  if (map) drawExistingBoundary();
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>
