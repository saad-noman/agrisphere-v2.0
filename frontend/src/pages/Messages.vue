<template>
  <main class="messages-page container py-4">
    <div class="msg-shell card" :class="{ 'msg-show-chat': mobileShowChat }">
      <!-- Conversation list -->
      <aside class="msg-list">
        <div class="msg-list-head">
          <h5 class="mb-0">Messages</h5>
          <div class="msg-list-head-actions">
            <button
              type="button"
              class="ai-icon-btn"
              title="Search conversations"
              aria-label="Search conversations"
              @click="toggleConvSearch"
            >
              🔍
            </button>
            <button
              v-if="canStartNew"
              type="button"
              class="btn-pill-sm btn-pill"
              @click="openExpertPicker = true"
            >
              + New
            </button>
          </div>
        </div>

        <div v-if="showConvSearch" class="msg-search-box">
          <input
            v-model="convSearch"
            type="text"
            class="form-control"
            placeholder="Search your conversations…"
          />
        </div>

        <div v-if="loadingConversations" class="loading-state">Loading conversations…</div>

        <p v-else-if="conversations.length === 0" class="empty-state">
          No conversations yet.
          <span v-if="canStartNew">Tap “+ New” to message an expert.</span>
        </p>

        <p v-else-if="filteredConversations.length === 0" class="empty-state">
          No conversations match “{{ convSearch }}”.
        </p>

        <ul v-else class="msg-conv-list">
          <li
            v-for="c in filteredConversations"
            :key="c._id"
            class="msg-conv-item"
            :class="{ 'msg-conv-active': activeId === c._id }"
            @click="openConversation(c)"
          >
            <div class="msg-avatar">
              <img v-if="c.otherUser?.profileImage" :src="serverUrl + c.otherUser.profileImage" alt="" />
              <span v-else>{{ initials(c.otherUser?.name) }}</span>
            </div>
            <div class="msg-conv-main">
              <div class="msg-conv-top">
                <span class="msg-conv-name">{{ c.otherUser?.name || 'User' }}</span>
                <span class="msg-conv-time">{{ shortTime(c.lastMessageAt) }}</span>
              </div>
              <div class="msg-conv-bottom">
                <span class="msg-conv-preview">{{ c.lastMessage || 'No messages yet' }}</span>
                <span v-if="c.unread" class="msg-unread">{{ c.unread }}</span>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Chat view -->
      <section class="msg-chat">
        <template v-if="active">
          <header class="msg-chat-head">
            <button type="button" class="msg-back" @click="mobileShowChat = false" aria-label="Back">←</button>
            <div class="msg-avatar msg-avatar-sm">
              <img v-if="active.otherUser?.profileImage" :src="serverUrl + active.otherUser.profileImage" alt="" />
              <span v-else>{{ initials(active.otherUser?.name) }}</span>
            </div>
            <div>
              <div class="fw-bold">{{ active.otherUser?.name }}</div>
              <router-link
                v-if="active.otherUser?.role === 'expert' && active.otherUser?.expertId"
                :to="`/experts/${active.otherUser.expertId}`"
                class="msg-view-profile"
              >
                Expert/Consultant
              </router-link>
              <span v-else class="text-muted small text-capitalize">{{ active.otherUser?.role }}</span>
            </div>
          </header>

          <div ref="threadRef" class="msg-thread">
            <div v-if="loadingMessages" class="loading-state">Loading…</div>
            <p v-else-if="messages.length === 0" class="empty-state">
              Say hello 👋 — start the conversation.
            </p>
            <p v-if="error" class="app-alert app-alert-danger mb-2">{{ error }}</p>
            <div
              v-for="m in messages"
              :key="m._id"
              class="msg-bubble-row"
              :class="isMine(m) ? 'msg-mine' : 'msg-theirs'"
            >
              <div class="msg-bubble" :class="{ 'msg-bubble-removed': m.deleted }">
                <span v-if="m.deleted" class="msg-text msg-text-removed">Message removed</span>
                <span v-else class="msg-text">{{ m.text }}</span>
                <span class="msg-time">{{ messageTime(m.createdAt) }}</span>
                <button
                  v-if="isMine(m) && !m.deleted"
                  type="button"
                  class="msg-delete-btn"
                  title="Remove message"
                  aria-label="Remove message"
                  @click="removeMessage(m)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <form class="msg-input-row" @submit.prevent="submitMessage">
            <input
              v-model="draft"
              type="text"
              class="msg-input"
              placeholder="Type a message…"
              :disabled="sending"
              maxlength="5000"
            />
            <button type="submit" class="btn-pill msg-send" :disabled="sending || !draft.trim()">
              Send
            </button>
          </form>
        </template>

        <div v-else class="msg-chat-placeholder">
          <div class="empty-state mb-0">
            Select a conversation to start chatting.
            <div style="font-style: italic;">(Farmers can only message experts)</div>
          </div>
        </div>
      </section>
    </div>

    <!-- Expert picker modal -->
    <div v-if="openExpertPicker" class="msg-modal-backdrop" @click.self="openExpertPicker = false">
      <div class="msg-modal card">
        <div class="msg-modal-head">
          <h5 class="mb-0">Message an expert</h5>
          <button type="button" class="ai-close" aria-label="Close" @click="openExpertPicker = false">✕</button>
        </div>
        <input v-model="expertSearch" type="text" class="form-control mb-3" placeholder="Search experts…" />
        <div class="msg-expert-list">
          <p v-if="filteredExperts.length === 0" class="empty-state">No experts found.</p>
          <button
            v-for="e in filteredExperts"
            :key="e._id"
            type="button"
            class="msg-expert-item"
            @click="startWithExpert(e)"
          >
            <div class="msg-avatar msg-avatar-sm">
              <img v-if="e.profileImage" :src="serverUrl + e.profileImage" alt="" />
              <span v-else>{{ initials(e.fullName) }}</span>
            </div>
            <div>
              <div class="fw-bold">{{ e.fullName }}</div>
              <div class="text-muted small">
                {{ [e.specialization, e.district].filter(Boolean).join(' • ') }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { serverUrl } from '../services/api';
import { authState } from '../stores/auth';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  getEligibleExperts,
  deleteMessage,
} from '../services/messageService';
import { confirmDelete } from '../stores/confirm';

const route = useRoute();
const router = useRouter();

const conversations = ref([]);
const active = ref(null);
const activeId = ref(null);
const messages = ref([]);
const draft = ref('');
const error = ref('');

const loadingConversations = ref(true);
const loadingMessages = ref(false);
const sending = ref(false);

const openExpertPicker = ref(false);
const experts = ref([]);
const expertSearch = ref('');

const showConvSearch = ref(false);
const convSearch = ref('');

const mobileShowChat = ref(false);
const threadRef = ref(null);

let listPoll = null;
let threadPoll = null;

const canStartNew = computed(() => ['farmer', 'expert'].includes(authState.user?.role));

function toggleConvSearch() {
  showConvSearch.value = !showConvSearch.value;
  if (!showConvSearch.value) convSearch.value = '';
}

// Search box next to "+ New" filters people already messaged — "+ New" stays
// reserved for starting a conversation with someone never messaged before.
const filteredConversations = computed(() => {
  const q = convSearch.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((c) => c.otherUser?.name?.toLowerCase().includes(q));
});

const filteredExperts = computed(() => {
  const q = expertSearch.value.trim().toLowerCase();
  if (!q) return experts.value;
  return experts.value.filter(
    (e) =>
      e.fullName?.toLowerCase().includes(q) ||
      e.specialization?.toLowerCase().includes(q) ||
      e.district?.toLowerCase().includes(q)
  );
});

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

// Shows date and time for every message, in the viewer's local timezone
function messageTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

// Compact stamp for the conversation list
function shortTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : messageTime(d);
}

async function removeMessage(m) {
  if (!(await confirmDelete('Remove this message? Its content will no longer be visible.'))) return;
  try {
    await deleteMessage(m._id);
    // Keeps its place in the timeline without the original content
    const target = messages.value.find((x) => x._id === m._id);
    if (target) {
      target.deleted = true;
      target.text = '';
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not remove the message.';
  }
}

function isMine(m) {
  return m.sender === authState.user?.id || m.sender?._id === authState.user?.id;
}

async function scrollThread() {
  await nextTick();
  if (threadRef.value) threadRef.value.scrollTop = threadRef.value.scrollHeight;
}

async function loadConversations() {
  try {
    const { data } = await getConversations();
    conversations.value = data;
  } catch {
    /* ignore transient errors during polling */
  } finally {
    loadingConversations.value = false;
  }
}

async function openConversation(c) {
  activeId.value = c._id;
  active.value = c;
  mobileShowChat.value = true;
  loadingMessages.value = true;
  messages.value = [];
  await loadMessages();
  loadingMessages.value = false;
  startThreadPoll();
  // Refresh list so unread badge clears.
  loadConversations();
}

async function loadMessages() {
  if (!activeId.value) return;
  try {
    const { data } = await getMessages(activeId.value);
    messages.value = data.messages;
    active.value = data.conversation;
    scrollThread();
  } catch {
    /* ignore */
  }
}

async function submitMessage() {
  const text = draft.value.trim();
  if (!text || sending.value || !activeId.value) return;
  sending.value = true;
  try {
    const { data } = await sendMessage(activeId.value, text);
    messages.value.push(data);
    draft.value = '';
    scrollThread();
    loadConversations();
  } catch {
    /* keep draft so the user can retry */
  } finally {
    sending.value = false;
  }
}

async function loadExperts() {
  try {
    const { data } = await getEligibleExperts();
    experts.value = data;
  } catch {
    experts.value = [];
  }
}

async function startWithExpert(expert) {
  openExpertPicker.value = false;
  try {
    const { data } = await startConversation({ expertId: expert._id });
    // Ensure it's in the list, then open it.
    await loadConversations();
    const existing = conversations.value.find((c) => c._id === data._id) || data;
    openConversation(existing);
  } catch {
    /* ignore */
  }
}

function startThreadPoll() {
  stopThreadPoll();
  threadPoll = setInterval(loadMessages, 5000);
}
function stopThreadPoll() {
  if (threadPoll) clearInterval(threadPoll);
  threadPoll = null;
}

// If arriving from an expert profile (/messages?expertId=...), auto-open.
async function handleQueryTarget() {
  const expertId = route.query.expertId;
  const userId = route.query.userId;
  if (!expertId && !userId) return;
  try {
    const { data } = await startConversation(expertId ? { expertId } : { userId });
    await loadConversations();
    const existing = conversations.value.find((c) => c._id === data._id) || data;
    openConversation(existing);
    // Clean the URL.
    router.replace({ path: '/messages' });
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  await loadConversations();
  await loadExperts();
  await handleQueryTarget();
  listPoll = setInterval(loadConversations, 8000);
});

onUnmounted(() => {
  if (listPoll) clearInterval(listPoll);
  stopThreadPoll();
});

watch(() => route.query, handleQueryTarget);
</script>
