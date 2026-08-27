import api from './api';

// Ask the agricultural AI assistant a question.
// history: optional array of prior { role: 'user'|'assistant', content } turns.
// config: optional axios config (e.g. { signal } to allow stopping the request).
export function askAssistant(message, history = [], config = {}) {
  return api.post('/assistant/chat', { message, history }, config);
}
