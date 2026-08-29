<template>
  <div class="ai-assistant">
    <!-- Launcher button -->
    <button
      type="button"
      class="ai-fab"
      :class="{ 'ai-fab-open': open }"
      :aria-label="open ? 'Close assistant' : 'Open agricultural assistant'"
      @click="toggle"
    >
      <span v-if="!open">
        <img src="/chat_bot.png" alt="AgriSphere Chat Bot" />
      </span>
      <span v-else>✕</span>
    </button>

    <!-- Chat panel -->
    <transition name="ai-slide">
      <section v-if="open" class="ai-panel" role="dialog" aria-label="Agricultural assistant">
        <header class="ai-panel-header">
          <div>
            <div class="ai-title">AgriSphere AI Assistant</div>
          </div>
          <button type="button" class="ai-close" aria-label="Close" @click="toggle">✕</button>
        </header>

        <div ref="scrollRef" class="ai-messages">
          <div v-if="messages.length === 0" class="ai-empty">
            <p class="mb-2">👋 Hi! I am here to help you with agriculture and using AgriSphere.</p>
            <div class="ai-suggestions">
              <button
                v-for="s in suggestions"
                :key="s"
                type="button"
                class="ai-chip"
                @click="quickAsk(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <div
            v-for="(m, i) in messages"
            :key="i"
            class="ai-bubble-row"
            :class="m.role === 'user' ? 'ai-row-user' : 'ai-row-assistant'"
          >
            <div class="ai-bubble" :class="m.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'">
              <template v-if="m.role === 'user'">
                <p v-for="(line, li) in m.content.split('\n')" :key="li" class="ai-line">{{ line }}</p>
              </template>
              <div v-else class="ai-formatted" v-html="formatMessageHtml(m.content)"></div>

              <!-- Specific experts/organizations/diseases found for this question -->
              <div v-if="m.sources && m.sources.length" class="ai-sources">
                <router-link
                  v-for="(s, si) in m.sources"
                  :key="si"
                  :to="s.link"
                  class="ai-source-card"
                  @click="open = false"
                >
                  <span class="ai-source-title">{{ s.title }}</span>
                  <span v-if="s.detail" class="ai-source-detail">{{ s.detail }}</span>
                </router-link>
              </div>

              <!-- Relevant platform pages -->
              <div v-if="m.links && m.links.length" class="ai-links">
                <router-link
                  v-for="(l, li) in m.links"
                  :key="li"
                  :to="l.link"
                  class="ai-link"
                  @click="open = false"
                >
                  {{ l.label }} →
                </router-link>
              </div>
            </div>
          </div>

          <div v-if="loading" class="ai-bubble-row ai-row-assistant">
            <div class="ai-bubble ai-bubble-assistant ai-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <form class="ai-input-row" @submit.prevent="send">
          <input
            v-model="draft"
            type="text"
            class="ai-input"
            placeholder="Ask about crops, soil, pests…"
            :disabled="loading"
            maxlength="2000"
          />
          <button
            type="button"
            class="ai-icon-btn"
            title="Refresh chat"
            aria-label="Refresh chat"
            @click="refreshChat"
          >
            ↻
          </button>
          <button v-if="loading" type="button" class="ai-send ai-stop" @click="stopResponse">Stop</button>
          <button v-else type="submit" class="ai-send" :disabled="!draft.trim()">Send</button>
        </form>
      </section>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { askAssistant } from '../services/assistantService';
import { authState } from '../stores/auth';

const open = ref(false);
const draft = ref('');
const loading = ref(false);
const messages = ref([]); // { role, content, links?, sources? }
const scrollRef = ref(null);
let activeRequest = null; // AbortController for the in-flight ask, if any

const suggestions = [
  'How do I control tomato late blight?',
  'Who is the top-rated expert for pest control?',
  'Suggest an organization that can help with soil testing',
  'Where can I see my consultations and appointments?',
];

// The widget is mounted once at the app root, so the chat is reset
// whenever the signed-in user changes.
watch(
  () => authState.token,
  () => {
    if (activeRequest) activeRequest.abort();
    messages.value = [];
    draft.value = '';
    loading.value = false;
  }
);

function toggle() {
  open.value = !open.value;
}

// Renders assistant markdown to HTML, sanitized before it reaches v-html
marked.setOptions({ gfm: true, breaks: true });

let hooksInstalled = false;
function ensureLinkHooks() {
  if (hooksInstalled) return;
  // Any link the model writes should open in a new tab instead of
  // navigating the SPA away from the chat widget.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  hooksInstalled = true;
}
ensureLinkHooks();

function formatMessageHtml(content) {
  const html = marked.parse(String(content || ''));
  return DOMPurify.sanitize(html, { ALLOWED_ATTR: ['href', 'target', 'rel'] });
}

async function scrollToBottom() {
  await nextTick();
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
}

function quickAsk(text) {
  draft.value = text;
  send();
}

async function send() {
  const text = draft.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ role: 'user', content: text });
  draft.value = '';
  loading.value = true;
  scrollToBottom();

  // Send a short history for context (last few turns).
  const history = messages.value
    .slice(-7, -1)
    .map((m) => ({ role: m.role, content: m.content }));

  activeRequest = new AbortController();

  try {
    const { data } = await askAssistant(text, history, { signal: activeRequest.signal });
    messages.value.push({
      role: 'assistant',
      content: data.reply,
      links: data.links || [],
      sources: data.sources || [],
    });
  } catch (err) {
    // A user-initiated stop shows no error bubble — the empty response is expected.
    if (err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
      messages.value.push({
        role: 'assistant',
        content:
          'Sorry, I could not reach the assistant right now. Please try again in a moment.',
        links: [],
        sources: [],
      });
    }
  } finally {
    loading.value = false;
    activeRequest = null;
    scrollToBottom();
  }
}

function stopResponse() {
  if (activeRequest) activeRequest.abort();
}

function refreshChat() {
  if (activeRequest) activeRequest.abort();
  messages.value = [];
  draft.value = '';
}
</script>
