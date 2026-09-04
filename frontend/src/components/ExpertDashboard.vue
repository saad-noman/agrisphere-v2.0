<template>
  <div class="role-dashboard">
    <header class="page-header">
      <h1>{{ t('dash.expertTitle') }}</h1>
      <p>{{ t('dash.expertSubtitle') }}</p>
    </header>

    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>
    <p v-if="loading" class="loading-state">{{ t('dash.loading') }}</p>

    <template v-else>
      <div class="role-stat-grid">
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.pendingRequests') }}</span>
            <strong class="role-stat-value">{{ pendingRequests.length }}</strong>
          </div>
        </div>
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.earningsThisMonth') }}</span>
            <strong class="role-stat-value">৳{{ summary.earningsThisMonth }}</strong>
          </div>
        </div>
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.walletBalance') }}</span>
            <strong class="role-stat-value">৳{{ summary.balance }}</strong>
          </div>
        </div>
        <div class="card role-stat">
          <div class="card-body">
            <span class="role-stat-label">{{ t('dash.totalEarnings') }}</span>
            <strong class="role-stat-value">৳{{ summary.totalEarnings }}</strong>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h2 class="h5 mb-3">{{ t('dash.pendingRequests') }}</h2>
              <p v-if="pendingRequests.length === 0" class="empty-state">{{ t('dash.noPending') }}</p>
              <ul v-else class="list-group">
                <li v-for="request in pendingRequests.slice(0, 5)" :key="request._id" class="list-group-item">
                  <div class="fw-bold">{{ request.title }}</div>
                  <div class="text-muted small">
                    {{ request.consultationType }}
                    <span v-if="request.fee > 0"> · ৳{{ request.fee }}</span>
                  </div>
                </li>
              </ul>
              <router-link to="/consultations/pending" class="btn-pill-outline btn-pill-sm mt-3">
                {{ t('dash.viewAllRequests') }}
              </router-link>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card">
            <div class="card-body">
              <h2 class="h5 mb-3">{{ t('dash.recentTransactions') }}</h2>
              <p v-if="transactions.length === 0" class="empty-state">{{ t('dash.noTransactions') }}</p>
              <ul v-else class="list-group">
                <li v-for="tx in transactions.slice(0, 5)" :key="tx._id" class="list-group-item">
                  <div class="d-flex justify-content-between gap-2">
                    <span>{{ tx.counterparty || t('dash.wallet') }}</span>
                    <strong :class="tx.direction === 'in' ? 'text-success' : ''">
                      {{ tx.direction === 'in' ? '+' : '−' }}৳{{ tx.amount }}
                    </strong>
                  </div>
                  <div class="text-muted small">{{ tx.note }}</div>
                </li>
              </ul>
              <router-link to="/profile" class="btn-pill-outline btn-pill-sm mt-3">
                {{ t('dash.managePricing') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { t } from '../i18n';
import { getPendingRequests } from '../services/consultationService';
import { getWalletSummary, getTransactions } from '../services/transactionService';

const pendingRequests = ref([]);
const transactions = ref([]);
const summary = ref({ balance: 0, totalEarnings: 0, earningsThisMonth: 0, totalSpent: 0 });
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  // Each panel is independent, so one failing request should not blank the page
  try {
    const { data } = await getPendingRequests();
    pendingRequests.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = t('dash.partialLoad');
  }

  try {
    const { data } = await getWalletSummary();
    summary.value = data;
  } catch (err) {
    /* keep the zeroed defaults */
  }

  try {
    const { data } = await getTransactions({ limit: 5 });
    transactions.value = data.transactions || [];
  } catch (err) {
    /* keep the empty list */
  }

  loading.value = false;
});
</script>
