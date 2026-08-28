import { reactive } from 'vue';

// Drop-in, promise-based replacement for window.confirm().
//
//   if (!(await confirmAction({ message: 'Delete this crop?' }))) return;
//
// The call resolves to true/false exactly like window.confirm did, so the
// existing action logic around each call site stays unchanged.
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
  // If a dialog is somehow already open, resolve it as cancelled first so we
  // never leave a dangling promise.
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
