import api from './api';

function toFormData(data) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
}

export function createConsultationRequest(data) {
  return api.post('/consultations/requests', toFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getMyRequests() {
  return api.get('/consultations/requests/mine');
}

export function getPendingRequests() {
  return api.get('/consultations/requests/pending');
}

export function approveRequest(id, data) {
  return api.put(`/consultations/requests/${id}/approve`, data);
}

export function rejectRequest(id) {
  return api.put(`/consultations/requests/${id}/reject`);
}

export function rescheduleRequest(id, data) {
  return api.put(`/consultations/requests/${id}/reschedule`, data);
}

export function acceptReschedule(id, data) {
  return api.put(`/consultations/requests/${id}/accept-reschedule`, data);
}

export function getMyAppointments() {
  return api.get('/consultations/appointments/mine');
}

export function completeAppointment(id, data) {
  return api.put(`/consultations/appointments/${id}/complete`, data);
}
