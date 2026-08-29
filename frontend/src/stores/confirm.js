import { reactive } from 'vue';

// Promise-based confirmation dialog. Resolves true when confirmed.
export const confirmState = reactive({
  open: false,
  title: 'Are you sure?',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'danger', // 'danger' | 'default'
});

let resolver = null;

export function confirmAction(options = {}) {
  // Cancel any dialog still open so no promise is left dangling
  if (resolver) resolveConfirm(false);

  confirmState.title = options.title || 'Are you sure?';
  confirmState.message = options.message || '';
  confirmState.confirmText = options.confirmText || 'Confirm';
  confirmState.cancelText = options.cancelText || 'Cancel';
  confirmState.tone = options.tone || 'danger';
  confirmState.open = true;

  return new Promise((resolve) => {
    resolver = resolve;
  });
}

export function resolveConfirm(result) {
  confirmState.open = false;
  if (resolver) {
    const r = resolver;
    resolver = null;
    r(result);
  }
}

/** Convenience wrapper for the common "delete this thing" case. */
export function confirmDelete(message, options = {}) {
  return confirmAction({
    title: options.title || 'Delete confirmation',
    message,
    confirmText: options.confirmText || 'Delete',
    cancelText: options.cancelText || 'Cancel',
    tone: 'danger',
  });
}
