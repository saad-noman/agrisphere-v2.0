import api from './api';

// Crop Intelligence & Early Warning API.
// Reference data and advisory generation are public; anything that stores
// something against the user requires a signed-in session.

export const getRegions = () => api.get('/crop-intelligence/regions');

export const getIntelCrops = () => api.get('/crop-intelligence/crops');

export const generateAdvisory = (payload) =>
  api.post('/crop-intelligence/advisory', payload);

export const getAdvisoryHistory = () => api.get('/crop-intelligence/history');

export const saveAdvisory = (payload) => api.post('/crop-intelligence/history', payload);

export const getAdvisoryRecord = (id) => api.get(`/crop-intelligence/history/${id}`);

export const deleteAdvisoryRecord = (id) => api.delete(`/crop-intelligence/history/${id}`);

export const getWatchlist = () => api.get('/crop-intelligence/watchlist');

export const addWatchField = (payload) => api.post('/crop-intelligence/watchlist', payload);

export const removeWatchField = (id) => api.delete(`/crop-intelligence/watchlist/${id}`);
