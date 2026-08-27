import api from './api';

export function searchExperts(filters) {
  return api.get('/experts', { params: filters });
}

export function getExpert(id) {
  return api.get(`/experts/${id}`);
}
