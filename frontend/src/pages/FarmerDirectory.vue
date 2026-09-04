<template>
  <div class="farmer-directory container py-4">
    <div class="page-header">
      <h1>{{ t('farmerDir.title') }}</h1>
      <p>{{ t('farmerDir.subtitle') }}</p>
    </div>

    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div class="row g-3">
      <div class="col-lg-3">
        <div class="card">
          <div class="card-body">
            <input v-model="filters.name" type="text" class="form-control mb-2"
              :placeholder="t('farmerDir.searchPlaceholder')" @keyup.enter="load" />
            <input v-model="filters.district" type="text" class="form-control mb-2"
              :placeholder="t('farmerDir.districtPlaceholder')" @keyup.enter="load" />
            <input v-model="filters.crop" type="text" class="form-control mb-2"
              :placeholder="t('farmerDir.cropPlaceholder')" @keyup.enter="load" />
            <div class="d-flex gap-2">
              <button type="button" class="btn-pill flex-fill" @click="load">{{ t('farmerDir.search') }}</button>
              <button type="button" class="btn-pill-secondary flex-fill" @click="clear">{{ t('farmerDir.clear') }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-9">
        <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
        <p v-else-if="visibleFarmers.length === 0" class="empty-state">{{ t('farmerDir.none') }}</p>

        <ul v-else class="list-group">
          <li v-for="farmer in visibleFarmers" :key="farmer._id" class="list-group-item">
            <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <div class="fw-bold">{{ farmer.name }}</div>
                <div v-if="place(farmer)" class="text-muted small">{{ place(farmer) }}</div>
                <div v-if="farmer.crops.length" class="text-muted small">
                  {{ t('marketplace.cropsListed') }}: {{ farmer.crops.join(', ') }}
                </div>
              </div>
              <div class="d-flex gap-2">
                <router-link :to="`/farmers/${farmer._id}/public`" class="btn-pill-outline btn-pill-sm">
                  {{ t('farmerDir.viewProfile') }}
                </router-link>
                <button v-if="authState.user" type="button" class="btn-pill btn-pill-sm"
                  :disabled="messagingId === farmer._id" @click="message(farmer)">
                  {{ messagingId === farmer._id ? '…' : t('farmerDir.message') }}
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { t } from '../i18n';
import { authState } from '../stores/auth';
import { getPublicFarmers } from '../services/farmerPublicService';
import { startConversation } from '../services/messageService';

const router = useRouter();
const farmers = ref([]);
const loading = ref(true);
const error = ref('');
const messagingId = ref(null);
const filters = ref({ name: '', district: '', crop: '' });

function place(farmer) {
  const parts = [];
  if (farmer.district) parts.push(farmer.district);
  if (farmer.division) parts.push(farmer.division);
  return parts.join(', ');
}

// Name is filtered on the client; district/crop are handled by the API
const visibleFarmers = computed(() => {
  const term = filters.value.name.trim().toLowerCase();
  if (!term) return farmers.value;

  const matches = [];
  for (let i = 0; i < farmers.value.length; i++) {
    if (farmers.value[i].name.toLowerCase().includes(term)) matches.push(farmers.value[i]);
  }
  return matches;
});

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const { data } = await getPublicFarmers({
      district: filters.value.district.trim(),
      crop: filters.value.crop.trim(),
    });
    farmers.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.loadFailed');
  } finally {
    loading.value = false;
  }
}

function clear() {
  filters.value = { name: '', district: '', crop: '' };
  load();
}

async function message(farmer) {
  messagingId.value = farmer._id;
  try {
    const { data } = await startConversation({ userId: farmer._id });
    router.push(`/messages?conversation=${data._id}`);
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.contactFailed');
  } finally {
    messagingId.value = null;
  }
}

onMounted(load);
</script>
