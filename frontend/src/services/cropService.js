import api from './api';

// The logged-in farmer's crops
export function getCrops() {
  return api.get('/crops');
}

export function createCrop(payload) {
  return api.post('/crops', payload);
}

export function updateCrop(id, payload) {
  return api.put(`/crops/${id}`, payload);
}
