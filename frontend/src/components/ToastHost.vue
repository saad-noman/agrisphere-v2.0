<template>
  <teleport to="body">
    <!-- Polite live region: announced by screen readers without interrupting -->
    <div class="toast-host" role="status" aria-live="polite" aria-atomic="false">
      <transition-group name="toast">
        <div
          v-for="toast in toastState.items"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.tone}`"
        >
          <span class="toast-icon" aria-hidden="true" v-html="iconFor(toast.tone)"></span>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            :aria-label="t('common.close')"
            @click="dismissToast(toast.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { toastState, dismissToast } from '../stores/toast';
import { t } from '../i18n';

// Shape as well as colour carries the meaning, so the state is still readable
// for colour-blind users and in high-contrast modes.
const ICONS = {
  success: '<path d="m5 13 4 4L19 7"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
};

function iconFor(tone) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[tone] || ICONS.info}</svg>`;
}
</script>
