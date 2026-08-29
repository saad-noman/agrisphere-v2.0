<template>
  <div class="community container py-4">
    <div class="page-header">
      <h1>Community Knowledge Hub</h1>
      <p>
        Ask questions and share what works. Farmers and agricultural experts
        discuss diseases, pests, soil, irrigation, fertilizers and more.
      </p>
    </div>

    <div v-if="error" class="app-alert app-alert-danger mb-3">{{ error }}</div>

    <!-- Search + filter + new post -->
    <div class="community-toolbar">
      <div class="community-search">
        <input
          v-model="search"
          type="search"
          class="form-control"
          placeholder="Search discussions by title, description or topic…"
          aria-label="Search discussions"
          @keyup.enter="runSearch"
        />
        <button type="button" class="btn-pill-outline" @click="runSearch">Search</button>
      </div>

      <select v-model="topic" class="form-select community-topic" aria-label="Filter by topic" @change="runSearch">
        <option value="">All topics</option>
        <option v-for="t in topics" :key="t" :value="t">{{ topicLabel(t) }}</option>
      </select>

      <button v-if="authState.user" type="button" class="btn-pill" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : 'Start a discussion' }}
      </button>
      <router-link v-else to="/login" class="btn-pill">Log in to post</router-link>
    </div>

    <!-- New post -->
    <div v-if="showForm && authState.user" class="card mb-3">
      <div class="card-body">
        <h3 class="h5 mb-3">Start a discussion</h3>
        <div v-if="formError" class="app-alert app-alert-danger mb-3">{{ formError }}</div>

        <div class="mb-3">
          <label class="form-label" for="post-title">Title</label>
          <input id="post-title" v-model="form.title" type="text" class="form-control" maxlength="180"
            placeholder="e.g. Yellow spots spreading on my rice leaves" />
        </div>
        <div class="mb-3">
          <label class="form-label" for="post-topic">Topic</label>
          <select id="post-topic" v-model="form.topic" class="form-select">
            <option v-for="t in topics" :key="t" :value="t">{{ topicLabel(t) }}</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label" for="post-body">Description</label>
          <textarea id="post-body" v-model="form.body" class="form-control" rows="5" maxlength="10000"
            placeholder="Describe the crop, symptoms, timeline and what you've already tried."></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label" for="post-images">
            Photos <span class="text-muted">(optional, up to {{ MAX_IMAGES }})</span>
          </label>
          <input
            id="post-images"
            ref="fileInput"
            type="file"
            class="form-control"
            accept="image/*"
            multiple
            @change="onImagesSelected"
          />
          <div v-if="selectedImages.length" class="image-preview-grid">
            <div v-for="(img, i) in selectedImages" :key="img.url" class="image-preview">
              <img :src="img.url" :alt="`Selected image ${i + 1}`" />
              <button type="button" class="image-preview-remove" :aria-label="`Remove image ${i + 1}`"
                @click="removeSelectedImage(i)">✕</button>
            </div>
          </div>
        </div>
        <button type="button" class="btn-pill" :disabled="posting" @click="submitPost">
          {{ posting ? 'Posting…' : 'Post discussion' }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <p v-if="loading" class="loading-state">Loading discussions…</p>
    <p v-else-if="posts.length === 0" class="empty-state">
      {{ search || topic ? 'No discussions match your search.' : 'No discussions yet. Be the first to post.' }}
    </p>

    <div v-else class="community-list">
      <article v-for="p in posts" :key="p._id" class="card community-card" @click="open(p._id)">
        <div class="card-body">
          <div class="community-card-top">
            <span class="community-topic-badge">{{ topicLabel(p.topic) }}</span>
            <span class="text-muted small">{{ formatDateTime(p.createdAt) }}</span>
          </div>
          <h3 class="community-card-title">{{ p.title }}</h3>
          <p class="community-card-excerpt">{{ excerpt(p.body) }}</p>

          <div v-if="p.images && p.images.length" class="community-thumb-strip">
            <img v-for="(img, i) in p.images.slice(0, 4)" :key="img" :src="serverUrl + img"
              :alt="`Attachment ${i + 1}`" class="community-thumb" loading="lazy" />
            <span v-if="p.images.length > 4" class="community-thumb-more">+{{ p.images.length - 4 }}</span>
          </div>
          <div class="community-card-meta">
            <span>{{ p.authorName || 'Member' }}</span>
            <span v-if="p.authorRole" class="community-role">{{ roleLabel(p.authorRole) }}</span>
            <span class="text-muted small">
              {{ p.commentCount }} {{ p.commentCount === 1 ? 'reply' : 'replies' }}
            </span>
            <span v-if="p.edited" class="edited-badge">Edited</span>
          </div>
        </div>
      </article>
    </div>

    <div v-if="hasMore && !loading" class="text-center mt-3">
      <button type="button" class="btn-pill-outline" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import { getPosts, createPost } from '../services/communityService';

const MAX_IMAGES = 5;

const router = useRouter();
const posts = ref([]);
const topics = ref([]);
const search = ref('');
const topic = ref('');
const page = ref(1);
const hasMore = ref(false);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref('');

const showForm = ref(false);
const posting = ref(false);
const formError = ref('');
const form = ref({ title: '', body: '', topic: 'general' });
const selectedImages = ref([]);
const fileInput = ref(null);

// Keeps the picker within the image limit and builds local previews
function onImagesSelected(event) {
  const picked = Array.from(event.target.files || []);
  const room = MAX_IMAGES - selectedImages.value.length;

  if (picked.length > room) {
    formError.value = `You can attach at most ${MAX_IMAGES} images.`;
  }

  picked.slice(0, Math.max(0, room)).forEach((file) => {
    selectedImages.value.push({ file, url: URL.createObjectURL(file) });
  });

  if (fileInput.value) fileInput.value.value = '';
}

function removeSelectedImage(index) {
  URL.revokeObjectURL(selectedImages.value[index].url);
  selectedImages.value.splice(index, 1);
}

function clearSelectedImages() {
  selectedImages.value.forEach((img) => URL.revokeObjectURL(img.url));
  selectedImages.value = [];
}

const LABELS = {
  'crop-disease': 'Crop disease',
  pests: 'Pests',
  soil: 'Soil',
  irrigation: 'Irrigation',
  fertilizer: 'Fertilizer',
  'farming-methods': 'Farming methods',
  'crop-management': 'Crop management',
  weather: 'Weather',
  general: 'General',
};
const topicLabel = (t) => LABELS[t] || t;
const roleLabel = (r) => (r === 'expert' ? 'Expert' : r === 'farmer' ? 'Farmer' : r);

const excerpt = (body) => (body.length > 180 ? `${body.slice(0, 180)}…` : body);

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function load(reset = true) {
  if (reset) {
    loading.value = true;
    page.value = 1;
  } else {
    loadingMore.value = true;
  }
  error.value = '';

  try {
    const { data } = await getPosts({
      search: search.value.trim(),
      topic: topic.value,
      page: page.value,
      limit: 10,
    });
    posts.value = reset ? data.posts : [...posts.value, ...data.posts];
    hasMore.value = data.hasMore;
    if (data.topics) topics.value = data.topics;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load discussions.';
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

const runSearch = () => load(true);

function loadMore() {
  page.value += 1;
  load(false);
}

function open(id) {
  router.push(`/community/${id}`);
}

async function submitPost() {
  formError.value = '';
  if (form.value.title.trim().length < 5) {
    formError.value = 'Title must be at least 5 characters.';
    return;
  }
  if (form.value.body.trim().length < 10) {
    formError.value = 'Description must be at least 10 characters.';
    return;
  }
  if (selectedImages.value.length > MAX_IMAGES) {
    formError.value = `You can attach at most ${MAX_IMAGES} images.`;
    return;
  }

  posting.value = true;
  try {
    const { data } = await createPost({
      title: form.value.title.trim(),
      body: form.value.body.trim(),
      topic: form.value.topic,
      images: selectedImages.value.map((img) => img.file),
    });
    form.value = { title: '', body: '', topic: 'general' };
    clearSelectedImages();
    showForm.value = false;
    router.push(`/community/${data._id}`);
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not post the discussion.';
  } finally {
    posting.value = false;
  }
}

onMounted(() => load(true));
</script>
