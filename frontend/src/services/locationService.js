import api from './api';

// Country list plus Bangladesh divisions/districts for the address form
export function getLocationOptions() {
  return api.get('/locations/options');
}
