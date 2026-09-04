<template>
  <div class="delivery-picker">
    <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
      <label class="form-label mb-0">{{ t('market2.deliveryPoint') }}</label>
      <button
        type="button"
        class="btn-pill-outline btn-pill-sm"
        :disabled="locating"
        @click="useCurrentLocation"
      >
        {{ locating ? t('geo.locating') : t('geo.useMyLocation') }}
      </button>
    </div>

    <p class="text-muted small mb-2">{{ t('market2.deliveryPointHint') }}</p>

    <div ref="mapEl" class="delivery-picker-map"></div>

    <div class="row g-2 mt-2">
      <div class="col-6">
        <label class="form-label" :for="`${idPrefix}-lat`">{{ t('market2.latitude') }}</label>
        <input
          :id="`${idPrefix}-lat`"
          :value="modelValue.latitude"
          type="number"
          step="any"
          class="form-control"
          placeholder="23.8103"
          @input="onManual('latitude', $event.target.value)"
        />
      </div>
      <div class="col-6">
        <label class="form-label" :for="`${idPrefix}-lng`">{{ t('market2.longitude') }}</label>
        <input
          :id="`${idPrefix}-lng`"
          :value="modelValue.longitude"
          type="number"
          step="any"
          class="form-control"
          placeholder="90.4125"
          @input="onManual('longitude', $event.target.value)"
        />
      </div>
    </div>

    <p v-if="locationError" class="error-text small mt-2 mb-0">{{ locationError }}</p>
    <p v-else-if="!hasPoint" class="error-text small mt-2 mb-0">{{ t('market2.deliveryPointMissing') }}</p>
    <p v-else class="text-muted small mt-2 mb-0">
      {{ t('market2.deliveryPointSet', { lat: fixed(modelValue.latitude), lng: fixed(modelValue.longitude) }) }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '../i18n';
import { useGeolocation } from '../composables/useGeolocation';

// The buyer's drop-off point. Emits { latitude, longitude } — either may be ''
// until a point is chosen, which the parent treats as "not set yet".
const props = defineProps({
  modelValue: { type: Object, required: true },
  idPrefix: { type: String, default: 'delivery' },
  // Where to centre before the buyer has chosen anything (usually the seller)
  fallbackCenter: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue']);

const mapEl = ref(null);
const { locate, locating, locationError } = useGeolocation();

let map = null;
let marker = null;

const hasPoint = computed(
  () => Number.isFinite(Number(props.modelValue.latitude))
    && Number.isFinite(Number(props.modelValue.longitude))
    && props.modelValue.latitude !== ''
    && props.modelValue.longitude !== ''
);

function fixed(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(5) : '';
}

function setPoint(lat, lng) {
  emit('update:modelValue', { latitude: lat, longitude: lng });
}

function onManual(field, raw) {
  emit('update:modelValue', { ...props.modelValue, [field]: raw === '' ? '' : Number(raw) });
}

// Keeps the pin in step with whatever the parent currently holds
function syncMarker() {
  if (!map) return;

  if (!hasPoint.value) {
    if (marker) { map.removeLayer(marker); marker = null; }
    return;
  }

  const position = [Number(props.modelValue.latitude), Number(props.modelValue.longitude)];

  if (marker) {
    marker.setLatLng(position);
  } else {
    marker = L.marker(position, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const point = marker.getLatLng();
      setPoint(Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6)));
    });
  }
}

async function useCurrentLocation() {
  const point = await locate(map, { zoom: 15 });
  if (point) setPoint(Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6)));
}

onMounted(async () => {
  await nextTick();
  if (!mapEl.value) return;

  const center = hasPoint.value
    ? [Number(props.modelValue.latitude), Number(props.modelValue.longitude)]
    : [props.fallbackCenter?.lat ?? 23.8103, props.fallbackCenter?.lng ?? 90.4125];

  map = L.map(mapEl.value, { minZoom: 3, maxZoom: 19 }).setView(center, hasPoint.value ? 14 : 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: 3,
    maxZoom: 19,
  }).addTo(map);

  // Tapping the map is the quickest way to drop the delivery point
  map.on('click', (event) => {
    setPoint(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
  });

  map.invalidateSize();
  syncMarker();
});

watch(() => props.modelValue, syncMarker, { deep: true });

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
  marker = null;
});
</script>
