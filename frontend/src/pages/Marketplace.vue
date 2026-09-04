<template>
  <div class="marketplace container py-4">
    <div class="page-header">
      <h1>{{ t('marketplace.title') }}</h1>
      <p>{{ t('marketplace.subtitle') }}</p>
    </div>

    <div v-if="notice" class="app-alert app-alert-success mb-3">{{ notice }}</div>
    <div v-if="error" class="app-alert app-alert-danger mb-3">{{ error }}</div>

    <!-- Browse / My listings -->
    <div class="market-toolbar">
      <div class="market-tabs">
        <button
          type="button"
          :class="tab === 'browse' ? 'btn-pill' : 'btn-pill-outline'"
          @click="switchTab('browse')"
        >
          {{ t('marketplace.browse') }}
        </button>
        <button
          type="button"
          :class="tab === 'sellers' ? 'btn-pill' : 'btn-pill-outline'"
          @click="switchTab('sellers')"
        >
          {{ t('marketplace.sellers') }}
        </button>
        <button
          v-if="authState.user"
          type="button"
          :class="tab === 'mine' ? 'btn-pill' : 'btn-pill-outline'"
          @click="switchTab('mine')"
        >
          {{ t('marketplace.myListings') }}
        </button>
      </div>

      <div v-if="tab === 'browse'" class="market-tabs">
        <button
          type="button"
          :class="view === 'list' ? 'btn-pill' : 'btn-pill-outline'"
          @click="setView('list')"
        >
          {{ t('marketplace.listView') }}
        </button>
        <button
          type="button"
          :class="view === 'map' ? 'btn-pill' : 'btn-pill-outline'"
          @click="setView('map')"
        >
          {{ t('marketplace.mapView') }}
        </button>
      </div>
    </div>

    <!-- ---------------- Browse: crop search ---------------- -->
    <!-- Two ways to read the same result set. List mode fills the page with
         cards; map mode moves the controls into a sidebar and hands the rest
         of the width to this module's own map. -->
    <template v-if="tab === 'browse'">
      <!-- ---- Map mode: controls + results left, map right ---- -->
      <div v-if="view === 'map'" class="crop-search-layout">
        <aside class="crop-search-sidebar">
          <CropSearchControls
            :query="cropQuery"
            layout="sidebar"
            uid="mk-map"
            @clear="clearCropFilters"
          />

          <p class="crop-search-count mt-3 mb-2">
            <span v-if="loading">{{ t('marketplace.loading') }}</span>
            <span v-else>{{ t('marketplace.resultCount', { count: listings.length }) }}</span>
          </p>

          <p v-if="!loading && listings.length === 0" class="empty-state">
            {{ t('marketplace.empty') }}
          </p>

          <ul v-else class="crop-result-list">
            <li
              v-for="listing in listings"
              :key="listing._id"
              class="crop-result"
              :class="{ 'is-focused': focusedId === listing._id }"
            >
              <button type="button" class="crop-result-main" @click="openListing(listing)">
                <span class="crop-result-photo">
                  <img v-if="listing.photo" :src="serverUrl + listing.photo" :alt="listing.cropType" />
                  <span v-else aria-hidden="true">🌾</span>
                </span>
                <span class="crop-result-text">
                  <span class="crop-result-name">{{ listing.cropType }}</span>
                  <span class="crop-result-meta">
                    {{ listing.quantity }} {{ listing.unit }} ·
                    <strong>{{ listing.price }} {{ listing.currency }}</strong>
                  </span>
                  <span class="crop-result-meta">{{ t(`market2.${listing.category || 'crop'}`) }}</span>
                  <span v-if="formatShortAddress(listing.address)" class="crop-result-meta">
                    {{ formatShortAddress(listing.address) }}
                  </span>
                  <span v-if="listing.sellerName" class="crop-result-meta">
                    {{ t('marketplace.seller') }}: {{ listing.sellerName }}
                  </span>
                </span>
              </button>

              <button
                v-if="listing.latitude != null && listing.longitude != null"
                type="button"
                class="crop-result-locate"
                :title="t('marketplace.showOnMap')"
                @click="focusOnMap(listing)"
              >
                📍
              </button>
            </li>
          </ul>
        </aside>

        <div class="crop-search-main">
          <div ref="mapContainer" class="leaflet-map crop-search-map"></div>
        </div>
      </div>

      <!-- ---- List mode: full-width filter bar above the card grid ---- -->
      <template v-else>
        <div class="crop-filter-bar mb-3">
          <CropSearchControls
            :query="cropQuery"
            layout="bar"
            uid="mk-list"
            @clear="clearCropFilters"
          />
        </div>

        <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>

        <template v-else>
          <p class="crop-search-count mb-2">
            {{ t('marketplace.resultCount', { count: listings.length }) }}
          </p>

          <p v-if="listings.length === 0" class="empty-state">{{ t('marketplace.empty') }}</p>

          <div v-else class="market-grid">
            <article
              v-for="listing in listings"
              :key="listing._id"
              class="card market-card is-clickable"
              @click="openListing(listing)"
            >
              <div class="market-photo">
                <img v-if="listing.photo" :src="serverUrl + listing.photo" :alt="listing.cropType" />
                <span v-else class="market-photo-placeholder" aria-hidden="true">🌾</span>
              </div>

              <div class="card-body">
                <span class="listing-category">{{ t(`market2.${listing.category || 'crop'}`) }}</span>
                <h3 class="market-crop">{{ listing.cropType }}</h3>
                <p class="market-qty">
                  {{ listing.quantity }} {{ listing.unit }} ·
                  <strong>{{ listing.price }} {{ listing.currency }}</strong>
                </p>
                <p v-if="formatShortAddress(listing.address)" class="text-muted small mb-1">
                  {{ formatShortAddress(listing.address) }}
                </p>
                <p v-if="listing.sellerName" class="text-muted small mb-2">
                  {{ t('marketplace.seller') }}: {{ listing.sellerName }}
                </p>
                <p v-if="listing.description" class="market-desc">{{ listing.description }}</p>

                <button
                  v-if="!listing.isOwner"
                  type="button"
                  class="btn-pill btn-pill-sm"
                  :disabled="contactingId === listing._id"
                  @click.stop="contactSeller(listing)"
                >
                  {{ contactingId === listing._id ? '…' : t('marketplace.contactSeller') }}
                </button>
                <button
                  v-if="!listing.isOwner && isOrganizationAccount"
                  type="button"
                  class="btn-pill-outline btn-pill-sm"
                  :disabled="interestingId === listing._id"
                  @click.stop="expressListingInterest(listing)"
                >
                  {{ interestingId === listing._id ? '…' : t('marketplace.expressInterest') }}
                </button>
                <span v-else-if="listing.isOwner" class="status-badge status-neutral">
                  {{ t('marketplace.yourListing') }}
                </span>
                <span class="market-view-hint">{{ t('market2.details') }} →</span>
              </div>
            </article>
          </div>
        </template>
      </template>
    </template>

    <!-- ---------------- Sellers (opted-in farmer profiles) ---------------- -->
    <template v-else-if="tab === 'sellers'">
      <p v-if="loadingSellers" class="loading-state">{{ t('marketplace.loading') }}</p>
      <p v-else-if="sellers.length === 0" class="empty-state">{{ t('marketplace.noSellers') }}</p>

      <div v-else class="market-grid">
        <article v-for="seller in sellers" :key="seller._id" class="card">
          <div class="card-body">
            <h3 class="market-crop">{{ seller.name }}</h3>
            <p v-if="sellerPlace(seller)" class="text-muted small mb-2">{{ sellerPlace(seller) }}</p>
            <p v-if="seller.crops.length" class="market-desc mb-2">
              {{ t('marketplace.cropsListed') }}: {{ seller.crops.join(', ') }}
            </p>
            <router-link :to="`/farmers/${seller._id}/public`" class="btn-pill-outline btn-pill-sm">
              {{ t('marketplace.viewProfile') }}
            </router-link>
          </div>
        </article>
      </div>
    </template>

    <!-- ---------------- My listings ---------------- -->
    <template v-else>
      <button type="button" class="btn-pill mb-3" @click="openCreateForm">
        {{ t('marketplace.newListing') }}
      </button>

      <div v-if="showForm" class="card mb-3">
        <div class="card-body">
          <h3 class="h5 mb-3">
            {{ editingId ? t('marketplace.editListing') : t('marketplace.newListing') }}
          </h3>
          <p v-if="formError" class="app-alert app-alert-danger">{{ formError }}</p>

          <div class="row g-2">
            <div class="col-md-6 mb-2">
              <label class="form-label" for="mk-crop">{{ t('marketplace.crop') }}</label>
              <input id="mk-crop" v-model="form.cropType" type="text" class="form-control" maxlength="120" />
            </div>
            <div class="col-md-3 mb-2">
              <label class="form-label" for="mk-qty">{{ t('marketplace.quantity') }}</label>
              <input id="mk-qty" v-model="form.quantity" type="number" min="0" step="any" class="form-control" />
            </div>
            <div class="col-md-3 mb-2">
              <label class="form-label" for="mk-unit">{{ t('marketplace.unit') }}</label>
              <input id="mk-unit" v-model="form.unit" type="text" class="form-control" maxlength="24" />
            </div>
            <div class="col-md-3 mb-2">
              <label class="form-label" for="mk-price">{{ t('marketplace.price') }}</label>
              <input id="mk-price" v-model="form.price" type="number" min="0" step="any" class="form-control" />
            </div>
            <div class="col-md-3 mb-2">
              <label class="form-label" for="mk-currency">{{ t('marketplace.currency') }}</label>
              <input id="mk-currency" v-model="form.currency" type="text" class="form-control" maxlength="8" />
            </div>
            <div class="col-md-6 mb-2">
              <label class="form-label" for="mk-photo">{{ t('marketplace.photo') }}</label>
              <input id="mk-photo" ref="photoInput" type="file" accept="image/*" class="form-control" @change="onPhotoSelected" />
            </div>
            <div class="col-12 mb-2">
              <label class="form-label" for="mk-desc">{{ t('marketplace.description') }}</label>
              <input id="mk-desc" v-model="form.description" type="text" class="form-control" maxlength="500" />
            </div>
          </div>

          <AddressFields id-prefix="mk" :address="form.address" @update:address="form.address = $event" />

          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <label class="form-label" for="mk-lat">{{ t('marketplace.latitude') }}</label>
              <input id="mk-lat" v-model="form.latitude" type="number" step="any" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label" for="mk-lng">{{ t('marketplace.longitude') }}</label>
              <input id="mk-lng" v-model="form.longitude" type="number" step="any" class="form-control" />
            </div>
          </div>

          <div class="d-flex gap-2">
            <button type="button" class="btn-pill" :disabled="saving" @click="saveListing">
              {{ saving ? '…' : t('marketplace.save') }}
            </button>
            <button type="button" class="btn-pill-secondary" @click="closeForm">
              {{ t('marketplace.cancel') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="loadingMine" class="loading-state">{{ t('marketplace.loading') }}</p>
      <p v-else-if="myListings.length === 0" class="empty-state">{{ t('marketplace.noneOfYours') }}</p>

      <ul v-else class="list-group">
        <li v-for="listing in myListings" :key="listing._id" class="list-group-item">
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div>
              <div class="fw-bold">{{ listing.cropType }}</div>
              <div class="text-muted small">
                {{ listing.quantity }} {{ listing.unit }} · {{ listing.price }} {{ listing.currency }}
              </div>
              <div v-if="formatShortAddress(listing.address)" class="text-muted small">
                {{ formatShortAddress(listing.address) }}
              </div>
              <span
                class="status-badge"
                :class="listing.status === 'active' ? 'status-success' : 'status-neutral'"
              >
                {{ listing.status === 'active' ? t('marketplace.active') : t('marketplace.closed') }}
              </span>
            </div>

            <div class="d-flex gap-2">
              <button type="button" class="btn-pill-outline btn-pill-sm" @click="editListing(listing)">
                {{ t('marketplace.edit') }}
              </button>
              <button
                v-if="listing.status === 'active'"
                type="button"
                class="btn-pill-danger btn-pill-sm"
                @click="closeOne(listing)"
              >
                {{ t('marketplace.close') }}
              </button>
              <button
                v-else
                type="button"
                class="btn-pill-danger btn-pill-sm"
                :disabled="deletingId === listing._id"
                @click="deleteOne(listing)"
              >
                {{ deletingId === listing._id ? '…' : t('marketplace.deleteListing') }}
              </button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { t } from '../i18n';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import { formatShortAddress, emptyAddress, toAddressForm } from '../utils/address';
import AddressFields from '../components/AddressFields.vue';
import CropSearchControls from '../components/CropSearchControls.vue';
import { escapeHtml } from '../utils/html';
import { getPublicFarmers } from '../services/farmerPublicService';
import {
  getListings,
  getMyListings,
  createListing,
  updateListing,
  closeListing,
  deleteListing,
  expressInterest,
} from '../services/listingService';
import { startConversation, sendMessage } from '../services/messageService';
import { confirmDelete } from '../stores/confirm';

const router = useRouter();

const tab = ref('browse');
const listings = ref([]);
const myListings = ref([]);
// One object holds every crop-search control, so the list layout and the map
// layout drive the exact same query instead of keeping two copies in sync.
const cropQuery = reactive({
  search: '',
  sort: 'newest',
  category: '',
  district: '',
  minPrice: '',
  maxPrice: '',
});

// 'list' shows the full-width card grid, 'map' the sidebar + map split
const view = ref('list');
const focusedId = ref(null);
const loading = ref(true);
const loadingMine = ref(false);
const deletingId = ref(null);
const error = ref('');
const notice = ref('');
const contactingId = ref(null);
const interestingId = ref(null);
const sellers = ref([]);
const loadingSellers = ref(false);

// Organization and market accounts browse rather than sell
const isOrganizationAccount = computed(() => {
  const role = authState.user?.role;
  return role === 'organization_owner' || role === 'market';
});

function openListing(listing) {
  router.push(`/marketplace/${listing._id}`);
}

function sellerPlace(seller) {
  const parts = [];
  if (seller.district) parts.push(seller.district);
  if (seller.division) parts.push(seller.division);
  if (seller.country) parts.push(seller.country);
  return parts.join(', ');
}

async function loadSellers() {
  loadingSellers.value = true;

  try {
    const { data } = await getPublicFarmers();
    sellers.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loadingSellers.value = false;
  }
}

// Records interest, then opens the existing Messages flow with context
async function expressListingInterest(listing) {
  interestingId.value = listing._id;
  error.value = '';

  try {
    await expressInterest(listing._id);
    notice.value = t('marketplace.interestSent');
    await contactSeller(listing, t('marketplace.interestMessage', { crop: listing.cropType }));
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.interestFailed');
  } finally {
    interestingId.value = null;
  }
}

const showForm = ref(false);
const saving = ref(false);
const formError = ref('');
const editingId = ref(null);
const photoInput = ref(null);
const form = ref(blankForm());

const mapContainer = ref(null);
let map = null;
let listingCluster = null;
const markersById = new Map();

function blankForm() {
  return {
    cropType: '',
    quantity: 1,
    unit: 'kg',
    price: 0,
    currency: 'BDT',
    description: '',
    latitude: '',
    longitude: '',
    address: emptyAddress(),
    photo: null,
  };
}

function switchTab(next) {
  tab.value = next;
  error.value = '';
  notice.value = '';

  if (next === 'mine') loadMine();
  if (next === 'sellers') loadSellers();

  // The map container is unmounted while another tab is open
  if (next === 'browse' && view.value === 'map') {
    nextTick(() => {
      ensureCropMap().then(() => renderListingMarkers());
    });
  } else if (next !== 'browse') {
    destroyCropMap();
  }
}

async function loadListings() {
  loading.value = true;
  error.value = '';

  try {
    const { data } = await getListings({
      search: cropQuery.search.trim(),
      sort: cropQuery.sort,
      category: cropQuery.category,
      district: cropQuery.district.trim(),
      minPrice: cropQuery.minPrice,
      maxPrice: cropQuery.maxPrice,
    });
    listings.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loading.value = false;
  }

  // Only map mode owns a map; in list mode there is nothing to redraw
  if (view.value === 'map') {
    await nextTick();
    await ensureCropMap();
    renderListingMarkers();
  }
}

// Typing should not fire a request per keystroke
let searchTimer = null;

function queueSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    loadListings();
  }, 300);
}

watch(cropQuery, queueSearch);

function clearCropFilters() {
  cropQuery.search = '';
  cropQuery.sort = 'newest';
  cropQuery.category = '';
  cropQuery.district = '';
  cropQuery.minPrice = '';
  cropQuery.maxPrice = '';
  focusedId.value = null;
}

// Centres the map on one result and opens its popup
function focusOnMap(listing) {
  if (!map || listing.latitude == null || listing.longitude == null) return;

  focusedId.value = listing._id;
  map.setView([listing.latitude, listing.longitude], 13);

  const marker = markersById.get(listing._id);
  if (marker) {
    // Cluster groups hide their children until zoomed in
    if (listingCluster && listingCluster.zoomToShowLayer) {
      listingCluster.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }
}

async function loadMine() {
  loadingMine.value = true;

  try {
    const { data } = await getMyListings();
    myListings.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loadingMine.value = false;
  }
}

// Leaf-style marker so listings read differently from the other map layers
function buildListingIcon() {
  const svg =
    `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">` +
    `<path d="M5 19c0-8 6-14 14-14 0 9-6 15-14 14Z" fill="#2f6b3a" stroke="#ffffff" stroke-width="1.4"/>` +
    `<path d="M5 19c2-5 5-8 9-10" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `</svg>`;

  return L.divIcon({ html: svg, className: 'listing-marker', iconSize: [26, 26], iconAnchor: [13, 20] });
}

function renderListingMarkers() {
  if (!map || !listingCluster) return;

  listingCluster.clearLayers();
  markersById.clear();

  const points = [];

  for (let i = 0; i < listings.value.length; i++) {
    const listing = listings.value[i];
    if (listing.latitude == null || listing.longitude == null) continue;

    const marker = L.marker([listing.latitude, listing.longitude], { icon: buildListingIcon() });

    // Listing text is user-supplied, so escape it before it becomes popup HTML
    const crop = escapeHtml(listing.cropType);
    const priceLine = escapeHtml(`${listing.quantity} ${listing.unit} · ${listing.price} ${listing.currency}`);
    const place = escapeHtml(formatShortAddress(listing.address));
    const seller = escapeHtml(listing.sellerName || '');

    marker.bindPopup(
      `<strong>${crop}</strong><br>` +
        `${priceLine}<br>` +
        (place ? `${place}<br>` : '') +
        (seller ? `${escapeHtml(t('marketplace.seller'))}: ${seller}` : '')
    );

    // Opening a pin leads to the same detail page as the result row
    marker.on('click', () => { focusedId.value = listing._id; });

    listingCluster.addLayer(marker);
    markersById.set(listing._id, marker);
    points.push([listing.latitude, listing.longitude]);
  }

  // Frame whatever the current search matched, so the map tracks the results
  if (points.length > 0) {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
  }
}

// Switching modes: the map only exists while map mode is on, so leaving it
// releases the Leaflet instance and entering it builds one against the fresh
// container and redraws the current results.
async function setView(next) {
  if (view.value === next) return;
  view.value = next;

  if (next === 'list') {
    destroyCropMap();
    return;
  }

  await nextTick();
  await ensureCropMap();
  renderListingMarkers();
}

function destroyCropMap() {
  markersById.clear();
  listingCluster = null;
  if (map) {
    map.remove();
    map = null;
  }
}

// This map belongs to the crop search alone — it is a separate instance from
// the services map and only ever carries listing markers.
async function ensureCropMap() {
  // Switching tabs unmounts the container, which leaves the old map bound to a
  // detached node. Rebuild whenever the element it was built on is gone.
  if (map && map.getContainer() !== mapContainer.value) destroyCropMap();

  if (map) {
    map.invalidateSize();
    return;
  }
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value, { minZoom: 3, maxZoom: 19 })
    .setView([23.8103, 90.4125], 7);
  // OpenStreetMap serves up to zoom 19; Leaflet's own default stops at 18.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    minZoom: 3,
    maxZoom: 19,
  }).addTo(map);

  listingCluster = L.markerClusterGroup();
  map.addLayer(listingCluster);
  map.invalidateSize();
}

function openCreateForm() {
  editingId.value = null;
  form.value = blankForm();
  formError.value = '';
  showForm.value = true;
}

function editListing(listing) {
  editingId.value = listing._id;
  form.value = {
    cropType: listing.cropType,
    quantity: listing.quantity,
    unit: listing.unit,
    price: listing.price,
    currency: listing.currency,
    description: listing.description || '',
    latitude: listing.latitude ?? '',
    longitude: listing.longitude ?? '',
    address: toAddressForm(listing.address),
    photo: null,
  };
  formError.value = '';
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  formError.value = '';
}

function onPhotoSelected(event) {
  const file = (event.target.files || [])[0];
  form.value.photo = file || null;
}

async function saveListing() {
  formError.value = '';

  if (!form.value.cropType.trim()) {
    formError.value = t('marketplace.cropRequired');
    return;
  }

  const quantity = Number(form.value.quantity);
  const price = Number(form.value.price);

  if (!Number.isFinite(quantity) || quantity < 0) {
    formError.value = t('marketplace.quantityInvalid');
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    formError.value = t('marketplace.priceInvalid');
    return;
  }

  saving.value = true;

  try {
    const payload = { ...form.value, quantity, price };
    if (!payload.photo) delete payload.photo;

    if (editingId.value) {
      await updateListing(editingId.value, payload);
      notice.value = t('marketplace.updated');
    } else {
      await createListing(payload);
      notice.value = t('marketplace.created');
    }

    showForm.value = false;
    await loadMine();
  } catch (err) {
    formError.value = err.response?.data?.message || t('marketplace.saveFailed');
  } finally {
    saving.value = false;
  }
}

// Closed listings can be removed for good. The server refuses while an order
// on the listing is still in flight, and that message is surfaced as-is.
async function deleteOne(listing) {
  const confirmed = await confirmDelete(t('marketplace.confirmDeleteListing'), {
    confirmText: t('marketplace.deleteListing'),
  });
  if (!confirmed) return;

  deletingId.value = listing._id;
  error.value = '';
  notice.value = '';

  try {
    await deleteListing(listing._id);
    await loadMine();
    notice.value = t('marketplace.deletedNotice');
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.saveFailed');
  } finally {
    deletingId.value = null;
  }
}

async function closeOne(listing) {
  const confirmed = await confirmDelete(t('marketplace.confirmClose'), {
    title: t('marketplace.close'),
    confirmText: t('marketplace.close'),
  });
  if (!confirmed) return;

  try {
    await closeListing(listing._id);
    await loadMine();
    notice.value = t('marketplace.closedNotice');
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.saveFailed');
  }
}

// Reuses the existing messaging flow rather than adding a second chat system
async function contactSeller(listing, openingMessage) {
  if (!authState.user) {
    router.push('/login');
    return;
  }

  contactingId.value = listing._id;
  error.value = '';

  try {
    const { data } = await startConversation({ userId: listing.sellerId });

    // Give the seller context about which listing this is about
    if (openingMessage) {
      try {
        await sendMessage(data._id, openingMessage);
      } catch (err) {
        // The conversation still opens even if the opener fails to send
      }
    }

    router.push(`/messages?conversation=${data._id}`);
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.contactFailed');
  } finally {
    contactingId.value = null;
  }
}

onMounted(loadListings);

onBeforeUnmount(() => {
  if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
  destroyCropMap();
});
</script>
