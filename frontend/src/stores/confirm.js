import { reactive } from 'vue';
import { t } from '../i18n';

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

  // Defaults are resolved at call time, not module load, so they follow the
  // language the user has selected.
  confirmState.title = options.title || t('confirm.defaultTitle');
  confirmState.message = options.message || '';
  confirmState.confirmText = options.confirmText || t('common.confirm');
  confirmState.cancelText = options.cancelText || t('common.cancel');
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
    title: options.title || t('confirm.deleteTitle'),
    message,
    confirmText: options.confirmText || t('common.delete'),
    cancelText: options.cancelText || t('common.cancel'),
    tone: 'danger',
  });
}
