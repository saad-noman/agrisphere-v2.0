<template>
  <div class="role-dashboard">
    <header class="page-header">
      <h1>{{ t('dash.orgTitle') }}</h1>
      <p>{{ t('dash.orgSubtitle') }}</p>
    </header>

    <p v-if="loading" class="loading-state">{{ t('dash.loading') }}</p>

    <template v-else>
      <div class="role-stat-grid">
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.myOrganizations') }}</span>
            <strong class="role-stat-value">{{ organizations.length }}</strong>
          </div>
        </div>
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.interestsPlaced') }}</span>
            <strong class="role-stat-value">{{ interestedListings.length }}</strong>
          </div>
        </div>
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.profileCompleteness') }}</span>
            <strong class="role-stat-value">{{ completeness }}%</strong>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h2 class="h5 mb-3">{{ t('dash.interestsPlaced') }}</h2>
              <p v-if="interestedListings.length === 0" class="empty-state">{{ t('dash.noInterests') }}</p>
              <ul v-else class="list-group">
                <li v-for="listing in interestedListings.slice(0, 5)" :key="listing._id" class="list-group-item">
                  <div class="fw-bold">{{ listing.cropType }}</div>
                  <div class="text-muted small">
                    {{ listing.quantity }} {{ listing.unit }} · {{ listing.price }} {{ listing.currency }}
                  </div>
                  <div v-if="formatShortAddress(listing.address)" class="text-muted small">
                    {{ formatShortAddress(listing.address) }}
                  </div>
                </li>
              </ul>
              <router-link to="/marketplace" class="btn-pill mt-3">{{ t('dash.browseMarketplace') }}</router-link>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h2 class="h5 mb-3">{{ t('dash.myOrganizations') }}</h2>
              <p v-if="organizations.length === 0" class="empty-state">{{ t('dash.noOrganizations') }}</p>
              <ul v-else class="list-group">
                <li v-for="org in organizations" :key="org._id" class="list-group-item">
                  <div class="fw-bold">{{ org.name }}</div>
                  <div v-if="formatShortAddress(org.address)" class="text-muted small">
                    {{ formatShortAddress(org.address) }}
                  </div>
                </li>
              </ul>
              <router-link to="/organizations/mine" class="btn-pill-outline btn-pill-sm mt-3">
                {{ t('dash.manageOrganizations') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { t } from '../i18n';
import { authState } from '../stores/auth';
import { formatShortAddress } from '../utils/address';
import { getMyOrganizations } from '../services/organizationService';
import { getListings } from '../services/listingService';

const organizations = ref([]);
const interestedListings = ref([]);
const loading = ref(true);

// A simple filled-fields score, so the card means something without a new endpoint
const completeness = computed(() => {
  const user = authState.user || {};
  const address = user.address || {};

  const checks = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.phone),
    Boolean(address.country),
    Boolean(address.district),
    organizations.value.length > 0,
  ];

  let filled = 0;
  for (let i = 0; i < checks.length; i++) {
    if (checks[i]) filled += 1;
  }

  return Math.round((filled / checks.length) * 100);
});

onMounted(async () => {
  try {
    const { data } = await getMyOrganizations();
    organizations.value = Array.isArray(data) ? data : [];
  } catch (err) {
    organizations.value = [];
  }

  try {
    const { data } = await getListings();
    const all = Array.isArray(data) ? data : [];
    const meId = authState.user ? String(authState.user.id || authState.user._id) : '';

    // Listings this account has already registered interest in
    const mine = [];
    for (let i = 0; i < all.length; i++) {
      const orgs = all[i].interestedOrgs || [];
      for (let j = 0; j < orgs.length; j++) {
        if (String(orgs[j]) === meId) mine.push(all[i]);
      }
    }
    interestedListings.value = mine;
  } catch (err) {
    interestedListings.value = [];
  }

  loading.value = false;
});
</script>
