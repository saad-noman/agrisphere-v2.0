<template>
  <div class="role-dashboard">
    <header class="page-header">
      <h1>{{ t('dash.adminTitle') }}</h1>
      <p>{{ t('dash.adminSubtitle') }}</p>
    </header>

    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>
    <p v-if="loading" class="loading-state">{{ t('dash.loading') }}</p>

    <template v-else>
      <div class="role-stat-grid">
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.totalUsers') }}</span>
            <strong class="role-stat-value">{{ stats.totalUsers }}</strong>
          </div>
        </div>
        <div v-for="(count, role) in stats.counts" :key="role" class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ roleLabel(role) }}</span>
            <strong class="role-stat-value">{{ count }}</strong>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-body">
          <h2 class="h5 mb-3">{{ t('dash.recentHazards') }}</h2>
          <p class="text-muted small">{{ t('dash.hazardsCommunityNote') }}</p>

          <p v-if="stats.recentHazards.length === 0" class="empty-state">{{ t('dash.noHazards') }}</p>
          <ul v-else class="list-group">
            <li v-for="hazard in stats.recentHazards" :key="hazard._id" class="list-group-item">
              <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                <div>
                  <div class="fw-bold">
                    {{ t(`hazard.${hazard.type}`) }}
                    <span class="status-badge status-neutral">{{ t(`hazard.${hazard.severity}`) }}</span>
                  </div>
                  <div v-if="hazard.description" class="text-muted small">{{ hazard.description }}</div>
                  <div class="text-muted small">{{ hazard.reporterName }}</div>
                </div>
                <button
                  type="button"
                  class="btn-pill-outline btn-pill-sm"
                  :disabled="resolvingId === hazard._id"
                  @click="resolve(hazard)"
                >
                  {{ resolvingId === hazard._id ? '…' : t('hazard.markResolved') }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-body">
          <h2 class="h5 mb-2">{{ t('dash.systemHealth') }}</h2>
          <p class="mb-0">
            <span class="status-badge status-success">{{ t('dash.allOperational') }}</span>
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { t } from '../i18n';
import api from '../services/api';
import { resolveRoadHazard } from '../services/roadHazardService';

const stats = ref({ totalUsers: 0, counts: {}, recentHazards: [] });
const loading = ref(true);
const error = ref('');
const resolvingId = ref(null);

const ROLE_LABELS = {
  farmer: 'dash.roleFarmers',
  expert: 'dash.roleExperts',
  organization_owner: 'dash.roleOrganizations',
  market: 'dash.roleMarkets',
  admin: 'dash.roleAdmins',
};

function roleLabel(role) {
  return ROLE_LABELS[role] ? t(ROLE_LABELS[role]) : role;
}

async function load() {
  try {
    const { data } = await api.get('/users/admin/stats');
    stats.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || t('dash.statsFailed');
  } finally {
    loading.value = false;
  }
}

async function resolve(hazard) {
  resolvingId.value = hazard._id;

  try {
    await resolveRoadHazard(hazard._id);
    // Drop it from the list rather than refetching the whole dashboard
    stats.value.recentHazards = stats.value.recentHazards.filter((h) => h._id !== hazard._id);
  } catch (err) {
    error.value = err.response?.data?.message || t('dash.resolveFailed');
  } finally {
    resolvingId.value = null;
  }
}

onMounted(load);
</script>
