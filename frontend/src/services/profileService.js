import api from './api';

export function getProfile() {
  return api.get('/users/me');
}

export function updateProfile(data) {
  return api.put('/users/me', data);
}

export function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  return api.post('/users/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteProfilePhoto() {
  return api.delete('/users/me/photo');
}

export function deleteProfile() {
  return api.delete('/users/me');
}
