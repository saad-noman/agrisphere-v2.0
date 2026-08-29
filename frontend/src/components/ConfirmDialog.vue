<template>
  <teleport to="body">
    <transition name="confirm-fade">
      <div
        v-if="visible"
        class="confirm-backdrop"
        @click.self="onCancel"
      >
        <div
          ref="dialogRef"
          class="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          @keydown.esc.prevent="onCancel"
        >
          <div class="confirm-icon" :class="`confirm-icon-${tone}`">
            <svg v-if="tone === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          </div>

          <h3 :id="titleId" class="confirm-title">{{ title }}</h3>
          <p :id="messageId" class="confirm-message">{{ message }}</p>

          <div class="confirm-actions">
            <button
              type="button"
              class="btn-pill-secondary confirm-btn"
              @click="onCancel"
            >
              {{ cancelText }}
            </button>
            <button
              ref="confirmBtn"
              type="button"
              class="confirm-btn"
              :class="tone === 'danger' ? 'confirm-btn-danger' : 'btn-pill'"
              @click="onConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { confirmState, resolveConfirm } from '../stores/confirm';

// Single app-wide confirmation dialog driven by stores/confirm.js
const dialogRef = ref(null);
const confirmBtn = ref(null);
let lastFocused = null;

const visible = ref(false);
const title = ref('');
const message = ref('');
const confirmText = ref('Confirm');
const cancelText = ref('Cancel');
const tone = ref('danger');

const titleId = 'confirm-dialog-title';
const messageId = 'confirm-dialog-message';

watch(
  () => confirmState.open,
  async (open) => {
    if (open) {
      title.value = confirmState.title;
      message.value = confirmState.message;
      confirmText.value = confirmState.confirmText;
      cancelText.value = confirmState.cancelText;
      tone.value = confirmState.tone;
      lastFocused = document.activeElement;
      visible.value = true;
      // Focus the dialog, not the destructive button, so Enter can't
      // confirm a deletion by accident
      await nextTick();
      dialogRef.value?.focus?.();
      document.body.style.overflow = 'hidden';
    } else {
      visible.value = false;
      document.body.style.overflow = '';
      lastFocused?.focus?.();
    }
  }
);

function onConfirm() {
  resolveConfirm(true);
}

function onCancel() {
  resolveConfirm(false);
}

function onKeydown(e) {
  if (!visible.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
    return;
  }
  // Simple focus trap across the two action buttons.
  if (e.key === 'Tab' && dialogRef.value) {
    const focusables = dialogRef.value.querySelectorAll('button');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

document.addEventListener('keydown', onKeydown);
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>
