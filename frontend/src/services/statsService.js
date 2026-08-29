import api from './api';

export function getPlatformStats() {
  return api.get('/stats/platform');
}
