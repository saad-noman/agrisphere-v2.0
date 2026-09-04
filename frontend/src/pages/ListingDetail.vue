<template>
  <div class="listing-detail container py-4">
    <router-link to="/marketplace" class="btn-pill-outline btn-pill-sm mb-3">
      ← {{ t('market2.backToList') }}
    </router-link>

    <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
    <p v-else-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <template v-else-if="listing">
      <div class="row g-3">
        <!-- Product -->
        <div class="col-lg-7">
          <div class="card">
            <div class="listing-hero">
              <img v-if="listing.photo" :src="serverUrl + listing.photo" :alt="listing.cropType" />
              <span v-else class="listing-hero-placeholder" aria-hidden="true">🌾</span>
            </div>
            <div class="card-body">
              <span class="listing-category">{{ t(`market2.${listing.category || 'crop'}`) }}</span>
              <h1 class="listing-title">{{ listing.cropType }}</h1>

              <p class="listing-price">
                {{ listing.price }} {{ listing.currency }}
                <span class="listing-price-unit">/ {{ listing.unit }}</span>
              </p>

              <ul class="listing-facts">
                <li>
                  <span>{{ t('market2.available') }}</span>
                  <strong>{{ listing.quantity }} {{ listing.unit }}</strong>
                </li>
                <li v-if="formatShortAddress(listing.address)">
                  <span>{{ t('auth.locationSection') }}</span>
                  <strong>{{ formatShortAddress(listing.address) }}</strong>
                </li>
                <li v-if="listing.sellerName">
                  <span>{{ t('market2.sellerLabel') }}</span>
                  <strong>{{ listing.sellerName }}</strong>
                </li>
              </ul>

              <p v-if="listing.description" class="listing-description">{{ listing.description }}</p>

              <div class="d-flex flex-wrap gap-2">
                <button v-if="!listing.isOwner" type="button" class="btn-pill-outline" @click="contactSeller">
                  {{ t('marketplace.contactSeller') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Buy + delivery -->
        <div class="col-lg-5">
          <div v-if="!listing.isOwner" class="card">
            <div class="card-body">
              <h2 class="h5 mb-1">{{ t('market2.buyNow') }}</h2>
              <p class="text-muted small">{{ t('market2.demoDelivery') }}</p>

              <p v-if="orderError" class="app-alert app-alert-danger">{{ orderError }}</p>
              <p v-if="orderNotice" class="app-alert app-alert-success">{{ orderNotice }}</p>

              <div class="mb-2">
                <label class="form-label" for="ord-qty">{{ t('market2.orderQuantity') }}</label>
                <div class="d-flex align-items-center gap-2">
                  <input id="ord-qty" v-model.number="quantity" type="number" min="1"
                    :max="listing.quantity" step="any" class="form-control" />
                  <span class="text-muted">{{ listing.unit }}</span>
                </div>
              </div>

              <p class="listing-total">
                <span>{{ t('market2.total') }}</span>
                <strong>{{ total }} {{ listing.currency }}</strong>
              </p>

              <label class="form-label">{{ t('market2.deliveryLocation') }}</label>
              <AddressFields id-prefix="ord" :address="deliveryAddress"
                @update:address="deliveryAddress = $event" />

              <!-- The courier route is drawn to whatever point the buyer picks -->
              <DeliveryLocationPicker
                v-model="deliveryPoint"
                id-prefix="ord"
                :fallback-center="sellerCenter"
                class="mb-3"
              />

              <div class="mb-3">
                <label class="form-label" for="ord-note">{{ t('market2.deliveryNote') }}</label>
                <input id="ord-note" v-model="deliveryNote" type="text" maxlength="300"
                  class="form-control" :placeholder="t('market2.deliveryNotePlaceholder')" />
              </div>

              <button v-if="!placedOrderId" type="button" class="btn-pill w-100" :disabled="placing" @click="submitOrder">
                {{ placing ? t('market2.placing') : t('market2.placeOrder') }}
              </button>

              <router-link v-else to="/orders" class="btn-pill w-100 text-center">
                {{ t('market2.myOrders') }}
              </router-link>
            </div>
          </div>

        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { t } from '../i18n';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import { formatShortAddress, emptyAddress, toAddressForm } from '../utils/address';
import AddressFields from '../components/AddressFields.vue';
import DeliveryLocationPicker from '../components/DeliveryLocationPicker.vue';
import { getListing } from '../services/listingService';
import { placeOrder } from '../services/orderService';
import { startConversation } from '../services/messageService';

const route = useRoute();
const router = useRouter();

const listing = ref(null);
const loading = ref(true);
const error = ref('');

const quantity = ref(1);
const deliveryAddress = ref(emptyAddress());

// The buyer's own drop-off point — deliberately not the seller's coordinates
const deliveryPoint = ref({ latitude: '', longitude: '' });

// Only used to centre the picker before the buyer chooses
const sellerCenter = computed(() => {
  if (!listing.value) return null;
  if (listing.value.latitude == null || listing.value.longitude == null) return null;
  return { lat: listing.value.latitude, lng: listing.value.longitude };
});

const hasDeliveryPoint = computed(
  () => deliveryPoint.value.latitude !== '' && deliveryPoint.value.longitude !== ''
    && Number.isFinite(Number(deliveryPoint.value.latitude))
    && Number.isFinite(Number(deliveryPoint.value.longitude))
);
const deliveryNote = ref('');
const placing = ref(false);
const orderError = ref('');
const orderNotice = ref('');

const placedOrderId = ref(null);

const total = computed(() => {
  if (!listing.value) return 0;
  const value = Number(quantity.value) * Number(listing.value.price);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
});

async function load() {
  try {
    // Fetches just this listing: the browse endpoint is capped at 200 rows, so
    // scanning it could miss the very listing being opened.
    const { data } = await getListing(route.params.id);
    listing.value = data || null;

    if (!listing.value) error.value = t('market2.listingNotFound');
    else deliveryAddress.value = toAddressForm(authState.user?.address);
  } catch (err) {
    if (err.response?.status === 404) error.value = t('market2.listingNotFound');
    else error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loading.value = false;
  }
}

async function contactSeller() {
  if (!authState.user) {
    router.push('/login');
    return;
  }

  try {
    const { data } = await startConversation({ userId: listing.value.sellerId });
    router.push(`/messages?conversation=${data._id}`);
  } catch (err) {
    orderError.value = err.response?.data?.message || t('marketplace.contactFailed');
  }
}

async function submitOrder() {
  orderError.value = '';
  orderNotice.value = '';

  if (!authState.user) {
    router.push('/login');
    return;
  }

  const qty = Number(quantity.value);
  if (!Number.isFinite(qty) || qty <= 0) {
    orderError.value = t('marketplace.quantityInvalid');
    return;
  }

  if (!hasDeliveryPoint.value) {
    orderError.value = t('market2.deliveryPointMissing');
    return;
  }

  placing.value = true;

  try {
    const { data } = await placeOrder({
      listingId: listing.value._id,
      quantity: qty,
      deliveryNote: deliveryNote.value,
      deliveryLatitude: Number(deliveryPoint.value.latitude),
      deliveryLongitude: Number(deliveryPoint.value.longitude),
      ...deliveryAddress.value,
    });

    orderNotice.value = t('market2.orderPlaced');
    placedOrderId.value = data._id;
  } catch (err) {
    const body = err.response?.data;

    if (body && body.error === 'insufficient_balance') {
      orderError.value = t('market2.insufficientFunds', {
        balance: body.balance,
        required: body.required,
      });
    } else {
      orderError.value = body?.message || t('market2.orderFailed');
    }
  } finally {
    placing.value = false;
  }
}



load();
</script>
