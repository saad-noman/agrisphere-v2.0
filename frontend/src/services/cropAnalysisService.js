import api from './api';

function imageForm(file) {
  const form = new FormData();
  form.append('image', file);
  return form;
}

export function detectDisease(file) {
  return api.post('/crop-analysis/detect-disease', imageForm(file), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getAnalysisHistory(kind) {
  return api.get('/crop-analysis/history', { params: kind ? { kind } : {} });
}

export function getAnalysisHistoryItem(id) {
  return api.get(`/crop-analysis/history/${id}`);
}

export function deleteAnalysis(id) {
  return api.delete(`/crop-analysis/history/${id}`);
}
