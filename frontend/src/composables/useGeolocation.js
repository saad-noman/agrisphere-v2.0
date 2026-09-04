import { ref } from 'vue';
import L from 'leaflet';
import { t } from '../i18n';

// Shared "use my location" behaviour for every map in the app: it asks the
// browser, drops a visible marker, centres the map, and reports failures in
// plain language instead of failing silently.
export function useGeolocation() {
  const locating = ref(false);
  const locationError = ref('');
  const coords = ref(null);

  let marker = null;

  function buildIcon() {
    return L.divIcon({
      html: '<span class="my-location-dot"></span>',
      className: 'my-location-icon',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function locate(map, options = {}) {
    return new Promise((resolve) => {
      locationError.value = '';

      if (!map) {
        resolve(null);
        return;
      }

      if (!navigator.geolocation) {
        locationError.value = t('geo.unsupported');
        resolve(null);
        return;
      }

      locating.value = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          coords.value = { lat, lng };

          // Reuse one marker so repeated clicks don't stack pins, and keep it
          // separate from any drawn boundary or delivery layer.
          if (marker) {
            marker.setLatLng([lat, lng]);
          } else {
            marker = L.marker([lat, lng], { icon: buildIcon(), zIndexOffset: 500 }).addTo(map);
            marker.bindPopup(t('geo.youAreHere'));
          }

          map.setView([lat, lng], options.zoom || 16);
          locating.value = false;
          resolve({ lat, lng });
        },
        (err) => {
          locationError.value =
            err && err.code === 1 ? t('geo.denied') : t('geo.failed');
          locating.value = false;
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  function clearMarker(map) {
    if (marker && map) map.removeLayer(marker);
    marker = null;
  }

  return { locate, clearMarker, locating, locationError, coords };
}
