import api from './api';

// Active community-reported road conditions
export function getRoadHazards() {
  return api.get('/road-hazards');
}

export function reportRoadHazard(payload) {
  return api.post('/road-hazards', payload);
}

export function confirmRoadHazard(id) {
  return api.patch(`/road-hazards/${id}/confirm`);
}

export function resolveRoadHazard(id) {
  return api.patch(`/road-hazards/${id}/resolve`);
}
