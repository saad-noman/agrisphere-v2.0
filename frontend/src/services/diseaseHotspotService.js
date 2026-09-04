import api from './api';

// District-level density of recent disease reports
export function getDiseaseHotspots() {
  return api.get('/disease-hotspots');
}
