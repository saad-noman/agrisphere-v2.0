import api from './api';

// Multipart requests let axios set its own boundary header
const formConfig = { headers: { 'Content-Type': 'multipart/form-data' } };

export function getPosts(params = {}) {
  return api.get('/community/posts', { params });
}

export function getPost(id) {
  return api.get(`/community/posts/${id}`);
}

// Builds the multipart body for a post, including any image files
function postFormData({ title, body, topic, images = [], keepImages }) {
  const form = new FormData();
  if (title !== undefined) form.append('title', title);
  if (body !== undefined) form.append('body', body);
  if (topic !== undefined) form.append('topic', topic);
  if (keepImages !== undefined) form.append('keepImages', keepImages.join(','));
  images.forEach((file) => form.append('images', file));
  return form;
}

export function createPost(payload) {
  return api.post('/community/posts', postFormData(payload), formConfig);
}

export function updatePost(id, payload) {
  return api.put(`/community/posts/${id}`, postFormData(payload), formConfig);
}

export function deletePost(id) {
  return api.delete(`/community/posts/${id}`);
}

export function addComment(postId, content, image) {
  const form = new FormData();
  form.append('content', content);
  if (image) form.append('image', image);
  return api.post(`/community/posts/${postId}/comments`, form, formConfig);
}

export function updateComment(postId, commentId, { content, image, removeImage }) {
  const form = new FormData();
  if (content !== undefined) form.append('content', content);
  if (image) form.append('image', image);
  if (removeImage) form.append('removeImage', 'true');
  return api.put(`/community/posts/${postId}/comments/${commentId}`, form, formConfig);
}

export function deleteComment(postId, commentId) {
  return api.delete(`/community/posts/${postId}/comments/${commentId}`);
}
