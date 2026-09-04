import api from './api';

// Demo wallet ledger and totals
export function getTransactions(params = {}) {
  return api.get('/transactions', { params });
}

export function getWalletSummary() {
  return api.get('/transactions/summary');
}

export function topUpWallet(amount) {
  return api.post('/transactions/top-up', { amount });
}
