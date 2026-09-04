import api from './api';

// Farmers who opted into marketplace discovery
export function getPublicFarmers(params = {}) {
  return api.get('/farmers/public', { params });
}

export function getPublicFarmer(id) {
  return api.get(`/farmers/${id}/public`);
}
