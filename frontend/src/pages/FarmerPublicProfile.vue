<template>
  <div class="farmer-public container py-4">
    <router-link to="/marketplace" class="btn-pill-outline btn-pill-sm mb-3">
      ← {{ t('marketplace.title') }}
    </router-link>

    <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
    <p v-else-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div v-else-if="farmer" class="card">
      <div class="card-body">
        <h1 class="community-post-title">{{ farmer.name }}</h1>

        <p v-if="place" class="text-muted mb-3">{{ place }}</p>

        <h2 class="h6">{{ t('marketplace.cropsListed') }}</h2>
        <p v-if="farmer.crops.length === 0" class="text-muted">{{ t('marketplace.noCropsListed') }}</p>
        <ul v-else class="list-group mb-3">
          <li v-for="crop in farmer.crops" :key="crop" class="list-group-item">{{ crop }}</li>
        </ul>

        <button v-if="authState.user" type="button" class="btn-pill" :disabled="contacting" @click="contact">
          {{ contacting ? '…' : t('marketplace.contactSeller') }}
        </button>
        <router-link v-else to="/login" class="btn-pill">{{ t('marketplace.loginToContact') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { t } from '../i18n';
import { authState } from '../stores/auth';
import { getPublicFarmer } from '../services/farmerPublicService';
import { startConversation } from '../services/messageService';

const route = useRoute();
const router = useRouter();

const farmer = ref(null);
const loading = ref(true);
const error = ref('');
const contacting = ref(false);

const place = computed(() => {
  if (!farmer.value) return '';

  const parts = [];
  if (farmer.value.district) parts.push(farmer.value.district);
  if (farmer.value.division) parts.push(farmer.value.division);
  if (farmer.value.country) parts.push(farmer.value.country);

  return parts.join(', ');
});

async function contact() {
  contacting.value = true;
  error.value = '';

  try {
    const { data } = await startConversation({ userId: route.params.id });
    router.push(`/messages?conversation=${data._id}`);
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.contactFailed');
  } finally {
    contacting.value = false;
  }
}

onMounted(async () => {
  try {
    const { data } = await getPublicFarmer(route.params.id);
    farmer.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || t('marketplace.profileNotPublic');
  } finally {
    loading.value = false;
  }
});
</script>
