import { reactive } from 'vue';

/**
 * Lightweight toast notifications.
 *
 * Several pages previously completed an action with no visible confirmation at
 * all — a save would succeed and nothing on screen changed. This gives every
 * action a consistent, accessible acknowledgement without each page inventing
 * its own banner.
 *
 * Messages are passed in already-translated so the store stays language-agnostic.
 */

let nextId = 1;

export const toastState = reactive({
  items: [],
});

const DEFAULT_DURATION = 4000;

export function dismissToast(id) {
  const index = toastState.items.findIndex((t) => t.id === id);
  if (index !== -1) toastState.items.splice(index, 1);
}

function push(message, tone, duration) {
  if (!message) return null;
  const id = nextId++;
  toastState.items.push({ id, message, tone });
  // Errors stay a little longer — they usually need reading, not glancing at.
  const life = duration ?? (tone === 'error' ? 6000 : DEFAULT_DURATION);
  setTimeout(() => dismissToast(id), life);
  return id;
}

export const toastSuccess = (message, duration) => push(message, 'success', duration);
export const toastError = (message, duration) => push(message, 'error', duration);
export const toastInfo = (message, duration) => push(message, 'info', duration);
