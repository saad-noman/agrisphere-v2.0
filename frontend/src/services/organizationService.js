import api from './api';

// Converts a plain object (which may include a File for "photo") into
// FormData, so organizations can be created/updated with an optional photo.
function toFormData(data) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
}

export function searchOrganizations(filters) {
  return api.get('/organizations', { params: filters });
}

export function getOrganization(id) {
  return api.get(`/organizations/${id}`);
}

export function getMyOrganizations() {
  return api.get('/organizations/mine');
}

export function createOrganization(data) {
  return api.post('/organizations', toFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function updateOrganization(id, data) {
  return api.put(`/organizations/${id}`, toFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteOrganizationPhoto(id) {
  return api.delete(`/organizations/${id}/photo`);
}

export function deleteOrganization(id) {
  return api.delete(`/organizations/${id}`);
}
