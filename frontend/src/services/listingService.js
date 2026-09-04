import api from './api';

const formConfig = { headers: { 'Content-Type': 'multipart/form-data' } };

// Turns a listing (which may include a photo File) into multipart form data
function toFormData(data) {
  const formData = new FormData();
  const keys = Object.keys(data);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = data[key];

    if (value === null || value === undefined) continue;

    if (key === 'address') {
      // The backend reads the address fields individually
      const addressKeys = Object.keys(value);
      for (let j = 0; j < addressKeys.length; j++) {
        const field = addressKeys[j];
        if (value[field]) formData.append(field, value[field]);
      }
      continue;
    }

    formData.append(key, value);
  }

  return formData;
}

export function getListings(params = {}) {
  return api.get('/listings', { params });
}

export function getListing(id) {
  return api.get(`/listings/${id}`);
}

export function getMyListings() {
  return api.get('/listings/mine');
}

export function createListing(data) {
  return api.post('/listings', toFormData(data), formConfig);
}

export function updateListing(id, data) {
  return api.put(`/listings/${id}`, toFormData(data), formConfig);
}

export function closeListing(id) {
  return api.patch(`/listings/${id}/close`);
}

export function deleteListing(id) {
  return api.delete(`/listings/${id}`);
}

export function expressInterest(id) {
  return api.post(`/listings/${id}/interest`);
}
