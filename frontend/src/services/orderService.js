import api from './api';

export function getOrders() {
  return api.get('/orders');
}

export function getOrder(id) {
  return api.get(`/orders/${id}`);
}

export function placeOrder(payload) {
  return api.post('/orders', payload);
}

// action: confirm | ready | start | deliver | receive
export function advanceOrder(id, action) {
  return api.patch(`/orders/${id}/${action}`);
}

export function getReceipt(id) {
  return api.get(`/orders/${id}/receipt`);
}
