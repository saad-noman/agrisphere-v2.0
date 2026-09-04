<template>
  <div class="wallet container py-4">
    <div class="page-header">
      <h1>{{ t('wallet.title') }}</h1>
      <p>{{ t('wallet.subtitle') }}</p>
    </div>

    <p class="app-alert app-alert-info wallet-demo-note">{{ t('wallet.demoNotice') }}</p>
    <p v-if="notice" class="app-alert app-alert-success">{{ notice }}</p>
    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div class="row g-3">
      <!-- Balance + top up -->
      <div class="col-lg-4">
        <div class="card wallet-balance-card">
          <div class="card-body">
            <span class="role-stat-label">{{ t('wallet.balance') }}</span>
            <strong class="wallet-balance">৳{{ summary.balance }}</strong>

            <div class="wallet-topup mt-3">
              <label class="form-label" for="topup">{{ t('wallet.topUpAmount') }}</label>
              <div class="d-flex gap-2">
                <input id="topup" v-model.number="amount" type="number" min="1" :max="5000"
                  step="1" class="form-control" />
                <button type="button" class="btn-pill" :disabled="toppingUp" @click="addFunds">
                  {{ toppingUp ? '…' : t('fee.addFunds') }}
                </button>
              </div>
              <p class="text-muted small mt-2 mb-0">{{ t('wallet.topUpLimit') }}</p>
            </div>
          </div>
        </div>

        <div class="role-stat-grid mt-3">
          <div class="card role-stat">
            <div class="card-body">
              <span class="role-stat-label">{{ t('dash.totalEarnings') }}</span>
              <strong class="role-stat-value">৳{{ summary.totalEarnings }}</strong>
            </div>
          </div>
          <div class="card role-stat">
            <div class="card-body">
              <span class="role-stat-label">{{ t('wallet.totalSpent') }}</span>
              <strong class="role-stat-value">৳{{ summary.totalSpent }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <h2 class="h5 mb-3">{{ t('wallet.history') }}</h2>

            <p v-if="loading" class="loading-state">{{ t('marketplace.loading') }}</p>
            <p v-else-if="transactions.length === 0" class="empty-state">{{ t('dash.noTransactions') }}</p>

            <ul v-else class="list-group">
              <li v-for="tx in transactions" :key="tx._id" class="list-group-item">
                <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                  <div>
                    <div class="fw-bold">{{ typeLabel(tx.type) }}</div>
                    <div class="text-muted small">
                      {{ tx.counterparty || t('dash.wallet') }} · {{ formatDate(tx.createdAt) }}
                    </div>
                    <div v-if="tx.note" class="text-muted small">{{ tx.note }}</div>
                  </div>
                  <strong :class="tx.direction === 'in' ? 'wallet-in' : 'wallet-out'">
                    {{ tx.direction === 'in' ? '+' : '−' }}৳{{ tx.amount }}
                  </strong>
                </div>
              </li>
            </ul>

            <button v-if="hasMore" type="button" class="btn-pill-outline btn-pill-sm mt-3"
              :disabled="loadingMore" @click="loadMore">
              {{ loadingMore ? '…' : t('wallet.loadMore') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { t } from '../i18n';
import { getWalletSummary, getTransactions, topUpWallet } from '../services/transactionService';

const summary = ref({ balance: 0, totalEarnings: 0, totalSpent: 0, earningsThisMonth: 0 });
const transactions = ref([]);
const page = ref(1);
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const amount = ref(500);
const toppingUp = ref(false);
const error = ref('');
const notice = ref('');

const TYPE_KEYS = {
  consultation_payment: 'wallet.typePayment',
  consultation_refund: 'wallet.typeRefund',
  top_up: 'wallet.typeTopUp',
};

function typeLabel(type) {
  return TYPE_KEYS[type] ? t(TYPE_KEYS[type]) : type;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function loadSummary() {
  try {
    const { data } = await getWalletSummary();
    summary.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || t('wallet.loadFailed');
  }
}

async function loadHistory(reset = true) {
  if (reset) {
    page.value = 1;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const { data } = await getTransactions({ page: page.value, limit: 20 });
    const rows = data.transactions || [];
    transactions.value = reset ? rows : [...transactions.value, ...rows];
    hasMore.value = Boolean(data.hasMore);
  } catch (err) {
    error.value = err.response?.data?.message || t('wallet.loadFailed');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadMore() {
  page.value += 1;
  loadHistory(false);
}

// Demo funds only — the server caps each top-up and records it in the ledger
async function addFunds() {
  error.value = '';
  notice.value = '';

  const value = Number(amount.value);
  if (!Number.isFinite(value) || value <= 0) {
    error.value = t('wallet.invalidAmount');
    return;
  }

  toppingUp.value = true;

  try {
    await topUpWallet(value);
    notice.value = t('wallet.topUpDone', { amount: value });
    await Promise.all([loadSummary(), loadHistory(true)]);
  } catch (err) {
    error.value = err.response?.data?.message || t('fee.topUpFailed');
  } finally {
    toppingUp.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadSummary(), loadHistory(true)]);
});
</script>
