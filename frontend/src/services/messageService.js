import api from './api';

export function getEligibleExperts() {
  return api.get('/messages/experts');
}

export function getConversations() {
  return api.get('/messages/conversations');
}

// target: { userId } or { expertId }
export function startConversation(target) {
  return api.post('/messages/conversations', target);
}

export function getMessages(conversationId) {
  return api.get(`/messages/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId, text) {
  return api.post(`/messages/conversations/${conversationId}/messages`, { text });
}

export function getUnreadCount() {
  return api.get('/messages/unread-count');
}

export function deleteMessage(messageId) {
  return api.delete(`/messages/messages/${messageId}`);
}
