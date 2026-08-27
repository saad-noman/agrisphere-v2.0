import api from './api';

export function getRatings(targetType, targetId) {
  return api.get('/ratings', { params: { targetType, targetId } });
}

export function getMyRating(targetType, targetId) {
  return api.get('/ratings/mine', { params: { targetType, targetId } });
}

export function submitRating(targetType, targetId, score, comment) {
  return api.post('/ratings', { targetType, targetId, score, comment });
}

export function deleteRating(id) {
  return api.delete(`/ratings/${id}`);
}
