<template>
  <div class="orders container py-4">
    <div class="page-header">
      <h1>{{ t('market2.myOrders') }}</h1>
      <p>{{ t('market2.ordersSubtitle') }}</p>
    </div>

    <p v-if="notice" class="app-alert app-alert-success">{{ notice }}</p>
    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>
    <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
    <p v-else-if="orders.length === 0" class="empty-state">{{ t('market2.noOrders') }}</p>

    <div v-else class="order-list">
      <article v-for="order in orders" :key="order._id" class="card order-card">
        <div class="card-body">
          <div class="order-head">
            <div>
              <h2 class="order-title">{{ order.cropType }}</h2>
              <p class="text-muted small mb-0">
                {{ order.quantity }} {{ order.unit }} × {{ order.unitPrice }} =
                <strong>{{ order.amount }} {{ order.currency }}</strong>
              </p>
              <p class="text-muted small mb-0">
                <span v-if="order.isBuyer">{{ t('market2.sellerLabel') }}: {{ order.sellerName }}</span>
                <span v-else>{{ t('market2.buyer') }}: {{ order.buyerName }}</span>
              </p>
            </div>
            <div class="d-flex flex-column align-items-end gap-1">
              <span class="status-badge" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
              <span class="status-badge" :class="order.paymentStatus === 'released' ? 'status-success' : 'status-warning'">
                {{ order.paymentStatus === 'released' ? t('market2.paymentReleased') : t('market2.paymentHeld') }}
              </span>
            </div>
          </div>

          <!-- Lifecycle timeline, driven entirely by the server's status -->
          <ol class="order-timeline">
            <li v-for="step in STEPS" :key="step.key"
              :class="{ 'is-done': stepIndex(order.status) > STEPS.indexOf(step),
                        'is-current': stepIndex(order.status) === STEPS.indexOf(step) }">
              <span class="order-timeline-dot"></span>
              <span>{{ t(`market2.step.${step.key}`) }}</span>
            </li>
          </ol>

          <p class="text-muted small mb-2">
            {{ t('market2.nextAction') }}: <strong>{{ nextActionText(order) }}</strong>
          </p>

          <p v-if="formatShortAddress(order.deliveryAddress)" class="text-muted small">
            {{ t('market2.deliveryLocation') }}: {{ formatShortAddress(order.deliveryAddress) }}
          </p>

          <div class="d-flex flex-wrap gap-2">
            <button v-for="action in order.actions" :key="action" type="button"
              class="btn-pill btn-pill-sm" :disabled="busyId === order._id"
              @click="run(order, action)">
              {{ busyId === order._id ? '…' : t(`market2.action.${action}`) }}
            </button>

            <button v-if="order.status === 'delivering'"
              type="button" class="btn-pill-outline btn-pill-sm" @click="track(order)">
              {{ t('market2.trackDelivery') }}
            </button>

            <!-- The finished run stays replayable for as long as the order exists -->
            <button v-else-if="order.status === 'delivered' || order.status === 'completed'"
              type="button" class="btn-pill-outline btn-pill-sm"
              :disabled="replaying && trackingId === order._id"
              @click="replayDelivery(order)">
              {{ replaying && trackingId === order._id
                ? t('market2.replaying')
                : t('market2.replayDelivery') }}
            </button>

            <button v-if="order.paymentStatus === 'released'" type="button"
              class="btn-pill-outline btn-pill-sm" @click="openReceipt(order)">
              {{ t('market2.viewReceipt') }}
            </button>
          </div>

          <!-- Road-based delivery tracking. Stays on screen for the whole run. -->
          <div v-if="trackingId === order._id" class="delivery-panel mt-3">
            <div class="delivery-panel-head">
              <span class="delivery-courier">🚚 {{ order.courierName }}</span>
              <span class="delivery-state" :class="progress >= 100 ? 'is-arrived' : 'is-moving'">
                {{ progress >= 100 ? t('market2.arrived') : t('market2.secondsLeft', { seconds: remainingSec }) }}
              </span>
            </div>

            <p v-if="routeError" class="app-alert app-alert-danger mb-2">{{ routeError }}</p>

            <div :id="'track-map-' + order._id" class="delivery-map"></div>

            <div class="delivery-legend">
              <span><i class="delivery-dot delivery-dot-from"></i>{{ t('market2.pickupPoint') }}</span>
              <span><i class="delivery-dot delivery-dot-to"></i>{{ t('market2.dropoffPoint') }}</span>
              <span v-if="routeInfo" class="delivery-distance">{{ routeInfo }}</span>
            </div>

            <div class="delivery-progress">
              <div class="delivery-progress-bar" :style="{ width: `${progress}%` }"></div>
            </div>

            <p class="delivery-progress-text">{{ progress }}%</p>
          </div>

          <!-- Receipt built from server data -->
          <div v-if="receiptFor === order._id && receipt" class="receipt-card mt-3">
            <h3 class="h6 mb-2">{{ t('market2.receipt') }} · {{ receipt.receiptNo }}</h3>
            <ul class="listing-facts mb-0">
              <li><span>{{ t('market2.buyer') }}</span><strong>{{ receipt.buyerName }}</strong></li>
              <li><span>{{ t('market2.sellerLabel') }}</span><strong>{{ receipt.sellerName }}</strong></li>
              <li><span>{{ receipt.item }}</span><strong>{{ receipt.quantity }} {{ receipt.unit }} × {{ receipt.unitPrice }}</strong></li>
              <li><span>{{ t('market2.deliveryFee') }}</span><strong>{{ receipt.deliveryFee }} {{ receipt.currency }}</strong></li>
              <li><span>{{ t('market2.total') }}</span><strong>{{ receipt.total }} {{ receipt.currency }}</strong></li>
              <li><span>{{ t('market2.paymentStatusLabel') }}</span><strong>{{ t('market2.paymentReleased') }}</strong></li>
            </ul>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '../i18n';
import { formatShortAddress } from '../utils/address';
import { getOrders, advanceOrder, getReceipt } from '../services/orderService';
import { fetchRoadRoute } from '../composables/useRoadRoute';

const STEPS = [
  { key: 'placed' }, { key: 'confirmed' }, { key: 'ready' },
  { key: 'delivering' }, { key: 'delivered' }, { key: 'completed' },
];
const ORDER_INDEX = {
  pending: 0, confirmed: 1, ready: 2, delivering: 3, delivered: 4, completed: 5, cancelled: -1,
};

const orders = ref([]);
const loading = ref(true);
const error = ref('');
const notice = ref('');
const busyId = ref(null);

const trackingId = ref(null);
const progress = ref(0);
const routeError = ref('');
const routeInfo = ref('');
const remainingSec = ref(0);
const replaying = ref(false);
let map = null;
let timer = null;
let truckMarker = null;
let routePath = null;

const receiptFor = ref(null);
const receipt = ref(null);

const stepIndex = (status) => ORDER_INDEX[status] ?? 0;

function statusLabel(status) {
  return t(`market2.status.${status}`);
}

function statusClass(status) {
  if (status === 'completed') return 'status-success';
  if (status === 'delivering' || status === 'delivered') return 'status-info';
  if (status === 'cancelled') return 'status-danger';
  return 'status-neutral';
}

// Tells the user who has to act next, from the server's own action list
function nextActionText(order) {
  if (order.status === 'completed') return t('market2.nothingLeft');
  if (order.actions.length > 0) return t(`market2.action.${order.actions[0]}`);
  return order.isBuyer ? t('market2.waitingSeller') : t('market2.waitingBuyer');
}

async function load() {
  loading.value = true;
  try {
    const { data } = await getOrders();
    orders.value = Array.isArray(data) ? data : [];
    await nextTick();
    syncTracking();
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loading.value = false;
  }
}

// Every action re-reads the list afterwards, so the UI always shows the
// state the server actually stored.
async function run(order, action) {
  busyId.value = order._id;
  error.value = '';
  notice.value = '';

  try {
    await advanceOrder(order._id, action);
    notice.value = t(`market2.done.${action}`);
    await load();
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.saveFailed');
    await load();
  } finally {
    busyId.value = null;
  }
}

async function openReceipt(order) {
  receiptFor.value = order._id;
  receipt.value = null;

  try {
    const { data } = await getReceipt(order._id);
    receipt.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || t('market2.receiptFailed');
    receiptFor.value = null;
  }
}

// Tears down any live map/animation before another one is drawn
function stopTracking() {
  if (timer) { clearInterval(timer); timer = null; }
  replaying.value = false;
  if (map) { map.remove(); map = null; }
  truckMarker = null;
  routePath = null;
}

// Every simulated delivery takes the same wall-clock time, whatever the route
const TRAVEL_MS = 15000;

// Snaps a finished delivery to its destination instead of replaying the drive
function finishAnimation() {
  if (timer) { clearInterval(timer); timer = null; }
  if (truckMarker && routePath && routePath.length) {
    truckMarker.setLatLng(routePath[routePath.length - 1]);
  }
  progress.value = 100;
  remainingSec.value = 0;
}

// Drives the truck along the stored road geometry over exactly TRAVEL_MS.
// Position comes from elapsed time, so a 700-point route and a 30-point one
// both finish in 15 seconds.
function runTravel() {
  if (!truckMarker || !routePath || routePath.length < 2) {
    finishAnimation();
    return;
  }

  const lastIndex = routePath.length - 1;
  const startedAt = Date.now();

  progress.value = 0;
  remainingSec.value = Math.round(TRAVEL_MS / 1000);
  truckMarker.setLatLng(routePath[0]);

  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    const ratio = Math.min((Date.now() - startedAt) / TRAVEL_MS, 1);

    truckMarker.setLatLng(routePath[Math.round(ratio * lastIndex)]);
    progress.value = Math.round(ratio * 100);
    remainingSec.value = Math.max(0, Math.ceil((TRAVEL_MS - ratio * TRAVEL_MS) / 1000));

    if (ratio >= 1) {
      clearInterval(timer);
      timer = null;
      replaying.value = false;
    }
  }, 60);
}

// Draws the real road route and animates the courier along it
async function track(order, options = {}) {
  const replay = options.replay === true;
  stopTracking();

  trackingId.value = order._id;
  routeError.value = '';
  routeInfo.value = '';
  progress.value = 0;
  await nextTick();

  // Each order's map lives in its own element, addressed by order id. A
  // template ref cannot be used here: inside v-for Vue makes it an array.
  const host = document.getElementById(`track-map-${order._id}`);
  if (!host) return;

  const from = { lat: order.pickupLatitude, lng: order.pickupLongitude };
  const to = { lat: order.deliveryLatitude, lng: order.deliveryLongitude };

  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
    routeError.value = t('market2.noCoordinates');
    return;
  }

  map = L.map(host, { minZoom: 3, maxZoom: 19 })
    .setView([(from.lat + to.lat) / 2, (from.lng + to.lng) / 2], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: 3,
    maxZoom: 19,
  }).addTo(map);

  // The panel is revealed in the same tick, so Leaflet must re-measure it
  map.invalidateSize();

  L.circleMarker([from.lat, from.lng], { radius: 7, color: '#2f6b3a', fillOpacity: 0.9 })
    .addTo(map).bindPopup(t('market2.sellerLabel'));
  L.circleMarker([to.lat, to.lng], { radius: 7, color: '#c0392b', fillOpacity: 0.9 })
    .addTo(map).bindPopup(t('market2.deliveryLocation'));

  const route = await fetchRoadRoute(from, to);

  // The order may have finished, or another one been tracked, while routing ran
  if (!map || trackingId.value !== order._id) return;

  if (!route) {
    // No invented straight line — say plainly that routing failed
    routeError.value = t('market2.routeUnavailable');
    map.fitBounds(L.latLngBounds([[from.lat, from.lng], [to.lat, to.lng]]), { padding: [30, 30] });
    return;
  }

  routePath = route.path;

  const line = L.polyline(routePath, { color: '#1e88e5', weight: 5 }).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [30, 30] });
  routeInfo.value = `${route.distanceKm.toFixed(1)} km`;

  truckMarker = L.marker(routePath[0], {
    icon: L.divIcon({ html: '<span class="delivery-truck">🚚</span>', className: 'delivery-truck-icon', iconSize: [28, 28], iconAnchor: [14, 14] }),
  }).addTo(map);

  // A finished delivery rests at its destination until it is replayed on
  // demand; a live one drives itself.
  if (order.status !== 'delivering' && !replay) {
    finishAnimation();
    return;
  }

  runTravel();
}

// Re-runs the saved delivery for an order that already arrived. The route is
// rebuilt from the pickup/drop-off points stored on the order, so it stays
// available for as long as the order record does.
async function replayDelivery(order) {
  replaying.value = true;
  await track(order, { replay: true });
}

// The delivery stage opens its own map: as soon as an order is out for
// delivery the route appears below it and the courier starts moving, with no
// extra click. Re-running load() must not restart an animation already going.
function syncTracking() {
  // A replay the user asked for owns the panel until it finishes
  if (replaying.value) return;

  const delivering = orders.value.find((order) => order.status === 'delivering');

  if (delivering) {
    if (trackingId.value !== delivering._id) track(delivering);
    return;
  }

  // The delivery being watched has just been marked delivered
  const tracked = orders.value.find((order) => order._id === trackingId.value);
  if (tracked && tracked.status !== 'delivering') finishAnimation();
}

onBeforeUnmount(stopTracking);

load();
</script>
