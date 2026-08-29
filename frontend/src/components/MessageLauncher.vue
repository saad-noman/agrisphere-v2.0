<template>
  <!-- Message button, shown above the chatbot. Guests are sent to login. -->
  <div class="msg-launcher">
    <button
      type="button"
      class="msg-fab"
      :title="tooltip"
      :aria-label="tooltip"
      @click="openMessages"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z" />
      </svg>
      <span v-if="unread" class="msg-fab-badge">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authState } from '../stores/auth';
import { getUnreadCount } from '../services/messageService';

const router = useRouter();
const unread = ref(0);
let poll = null;

// Only farmers and experts have conversations, so only they get a badge.
const canMessage = computed(
  () =>
    !!authState.user &&
    (authState.user.role === 'farmer' || authState.user.role === 'expert')
);

const tooltip = computed(() =>
  authState.user ? 'Messages' : 'Log in to use messages'
);

async function loadUnread() {
  if (!canMessage.value) return;
  try {
    const { data } = await getUnreadCount();
    unread.value = data.unread || 0;
  } catch {
    /* transient errors are fine to ignore */
  }
}

function openMessages() {
  router.push(authState.user ? '/messages' : '/login');
}

function startPolling() {
  stopPolling();
  unread.value = 0;
  if (canMessage.value) {
    loadUnread();
    poll = setInterval(loadUnread, 20000);
  }
}

function stopPolling() {
  if (poll) {
    clearInterval(poll);
    poll = null;
  }
}

onMounted(startPolling);
onUnmounted(stopPolling);

// Restart on login/logout/account switch.
watch(() => authState.token, startPolling);
</script>
