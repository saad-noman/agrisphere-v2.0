import api from './api';

export function lookupPrices(names) {
  return api.get('/price-plans/prices', { params: { items: names.join(',') } });
}

export function getCatalog() {
  return api.get('/price-plans/catalog');
}

export function calculatePlan(items) {
  return api.post('/price-plans/calculate', { items });
}

export function getPlans() {
  return api.get('/price-plans');
}

export function getPlan(id) {
  return api.get(`/price-plans/${id}`);
}

export function createPlan(payload) {
  return api.post('/price-plans', payload);
}

export function updatePlan(id, payload) {
  return api.put(`/price-plans/${id}`, payload);
}

export function refreshPlanPrices(id) {
  return api.post(`/price-plans/${id}/refresh`);
}

export function deletePlan(id) {
  return api.delete(`/price-plans/${id}`);
}
