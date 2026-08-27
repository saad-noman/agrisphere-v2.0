import api from './api';

export function getNotifications() {
  return api.get('/notifications');
}

export function markNotificationRead(id) {
  return api.put(`/notifications/${id}/read`);
}
