<template>
  <div class="community-post container py-4">
    <router-link to="/community" class="btn-pill-outline btn-pill-sm mb-3">← All discussions</router-link>

    <div v-if="error" class="app-alert app-alert-danger mb-3">{{ error }}</div>
    <p v-if="loading" class="loading-state">Loading discussion…</p>

    <template v-else-if="post">
      <article class="card mb-3">
        <div class="card-body">
          <div class="community-card-top">
            <span class="community-topic-badge">{{ topicLabel(post.topic) }}</span>
            <span class="text-muted small">{{ formatDateTime(post.createdAt) }}</span>
          </div>

          <template v-if="!editingPost">
            <h1 class="community-post-title">{{ post.title }}</h1>

            <div class="community-card-meta mb-3">
              <span>{{ post.authorName || 'Member' }}</span>
              <span v-if="post.authorRole" class="community-role">{{ roleLabel(post.authorRole) }}</span>
              <span v-if="post.edited" class="edited-badge">Edited</span>
            </div>

            <p class="community-post-body">{{ post.body }}</p>

            <div v-if="post.images && post.images.length" class="community-gallery">
              <a v-for="(img, i) in post.images" :key="img" :href="serverUrl + img" target="_blank"
                rel="noopener" class="community-gallery-item">
                <img :src="serverUrl + img" :alt="`Attachment ${i + 1}`" loading="lazy" />
              </a>
            </div>

            <div v-if="post.isOwner" class="community-owner-actions">
              <button type="button" class="btn-pill-outline btn-pill-sm" @click="startEditPost">Edit</button>
              <button type="button" class="btn-pill-danger btn-pill-sm" @click="removePost">
                Delete discussion
              </button>
            </div>
          </template>

          <template v-else>
            <h2 class="h5 mb-3">Edit discussion</h2>

            <div class="mb-3">
              <label class="form-label" for="edit-title">Title</label>
              <input id="edit-title" v-model="postDraft.title" type="text" class="form-control" maxlength="180" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="edit-topic">Topic</label>
              <select id="edit-topic" v-model="postDraft.topic" class="form-select">
                <option v-for="t in topicKeys" :key="t" :value="t">{{ topicLabel(t) }}</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label" for="edit-body">Description</label>
              <textarea id="edit-body" v-model="postDraft.body" class="form-control" rows="5" maxlength="10000"></textarea>
            </div>

            <div class="mb-3">
              <label class="form-label">Photos <span class="text-muted">(up to {{ MAX_IMAGES }})</span></label>

              <div v-if="postDraft.keepImages.length || newImages.length" class="image-preview-grid">
                <div v-for="(img, i) in postDraft.keepImages" :key="img" class="image-preview">
                  <img :src="serverUrl + img" :alt="`Attachment ${i + 1}`" />
                  <button type="button" class="image-preview-remove" aria-label="Remove attachment"
                    @click="dropExistingImage(i)">✕</button>
                </div>
                <div v-for="(img, i) in newImages" :key="img.url" class="image-preview">
                  <img :src="img.url" :alt="`New attachment ${i + 1}`" />
                  <button type="button" class="image-preview-remove" aria-label="Remove new attachment"
                    @click="dropNewImage(i)">✕</button>
                </div>
              </div>

              <input ref="postFileInput" type="file" class="form-control" accept="image/*" multiple
                @change="onPostImagesSelected" />
            </div>

            <div class="community-owner-actions">
              <button type="button" class="btn-pill" :disabled="savingPost" @click="savePost">
                {{ savingPost ? 'Saving…' : 'Save changes' }}
              </button>
              <button type="button" class="btn-pill-secondary btn-pill-sm" @click="cancelEditPost">Cancel</button>
            </div>
          </template>
        </div>
      </article>

      <!-- Comments -->
      <h2 class="h5 mb-3">
        {{ post.comments.length }} {{ post.comments.length === 1 ? 'reply' : 'replies' }}
      </h2>

      <div v-if="authState.user" class="card mb-3">
        <div class="card-body">
          <label class="form-label" for="comment-box">Add a reply</label>
          <textarea
            id="comment-box"
            v-model="commentText"
            class="form-control mb-2"
            rows="3"
            maxlength="5000"
            placeholder="Share advice, ask a follow-up, or describe what worked for you."
          ></textarea>

          <label class="form-label" for="comment-image">Photo <span class="text-muted">(optional)</span></label>
          <input id="comment-image" ref="commentFileInput" type="file" class="form-control mb-2"
            accept="image/*" @change="onCommentImageSelected" />

          <div v-if="commentImage" class="image-preview-grid mb-2">
            <div class="image-preview">
              <img :src="commentImage.url" alt="Selected reply image" />
              <button type="button" class="image-preview-remove" aria-label="Remove image"
                @click="clearCommentImage">✕</button>
            </div>
          </div>

          <button type="button" class="btn-pill" :disabled="commenting" @click="submitComment">
            {{ commenting ? 'Posting…' : 'Post reply' }}
          </button>
        </div>
      </div>
      <p v-else class="empty-state mb-3">
        <router-link to="/login">Log in</router-link> to join the discussion.
      </p>

      <p v-if="post.comments.length === 0" class="empty-state">
        No replies yet. Share your knowledge.
      </p>

      <ul v-else class="list-group community-comments">
        <li v-for="c in post.comments" :key="c._id" class="list-group-item">
          <div class="community-card-meta">
            <span class="fw-bold">{{ c.authorName || 'Member' }}</span>
            <span v-if="c.authorRole" class="community-role">{{ roleLabel(c.authorRole) }}</span>
            <span class="text-muted small">{{ formatDateTime(c.createdAt) }}</span>
            <span v-if="c.edited" class="edited-badge">Edited</span>
          </div>

          <template v-if="editingCommentId !== c._id">
            <p class="community-comment-body">{{ c.content }}</p>

            <a v-if="c.image" :href="serverUrl + c.image" target="_blank" rel="noopener"
              class="community-comment-image">
              <img :src="serverUrl + c.image" alt="Reply attachment" loading="lazy" />
            </a>

            <div class="community-owner-actions">
              <button v-if="c.isOwner" type="button" class="btn-pill-outline btn-pill-sm"
                @click="startEditComment(c)">Edit</button>
              <button v-if="c.isOwner || post.isOwner" type="button" class="btn-pill-danger btn-pill-sm"
                @click="removeComment(c)">Delete</button>
            </div>
          </template>

          <template v-else>
            <textarea v-model="commentDraft.content" class="form-control mb-2" rows="3" maxlength="5000"></textarea>

            <div v-if="commentDraft.existingImage && !commentDraft.removeImage && !commentDraft.newImage"
              class="image-preview-grid mb-2">
              <div class="image-preview">
                <img :src="serverUrl + commentDraft.existingImage" alt="Current attachment" />
                <button type="button" class="image-preview-remove" aria-label="Remove attachment"
                  @click="commentDraft.removeImage = true">✕</button>
              </div>
            </div>
            <div v-if="commentDraft.newImage" class="image-preview-grid mb-2">
              <div class="image-preview">
                <img :src="commentDraft.newImage.url" alt="New attachment" />
                <button type="button" class="image-preview-remove" aria-label="Remove new attachment"
                  @click="commentDraft.newImage = null">✕</button>
              </div>
            </div>

            <input ref="editCommentFileInput" type="file" class="form-control mb-2" accept="image/*"
              @change="onEditCommentImageSelected" />

            <div class="community-owner-actions">
              <button type="button" class="btn-pill btn-pill-sm" :disabled="savingComment" @click="saveComment(c)">
                {{ savingComment ? 'Saving…' : 'Save' }}
              </button>
              <button type="button" class="btn-pill-secondary btn-pill-sm" @click="cancelEditComment">Cancel</button>
            </div>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import {
  getPost,
  addComment,
  updateComment,
  updatePost,
  deletePost,
  deleteComment,
} from '../services/communityService';
import { confirmDelete } from '../stores/confirm';

const MAX_IMAGES = 5;

const route = useRoute();
const router = useRouter();

const post = ref(null);
const loading = ref(true);
const error = ref('');
const commentText = ref('');
const commenting = ref(false);
const commentImage = ref(null);
const commentFileInput = ref(null);

const editingPost = ref(false);
const savingPost = ref(false);
const postDraft = ref({ title: '', body: '', topic: 'general', keepImages: [] });
const newImages = ref([]);
const postFileInput = ref(null);

const editingCommentId = ref(null);
const savingComment = ref(false);
const commentDraft = ref({ content: '', existingImage: null, newImage: null, removeImage: false });
const editCommentFileInput = ref(null);

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
const topicKeys = Object.keys(LABELS);
const roleLabel = (r) => (r === 'expert' ? 'Expert' : r === 'farmer' ? 'Farmer' : r);

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await getPost(route.params.id);
    post.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load this discussion.';
  } finally {
    loading.value = false;
  }
}

async function submitComment() {
  const content = commentText.value.trim();
  if (!content) {
    error.value = 'Reply cannot be empty.';
    return;
  }
  commenting.value = true;
  error.value = '';
  try {
    const { data } = await addComment(route.params.id, content, commentImage.value?.file);
    post.value.comments.push(data);
    commentText.value = '';
    clearCommentImage();
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not post the reply.';
  } finally {
    commenting.value = false;
  }
}

async function removePost() {
  if (!(await confirmDelete('Are you sure you want to delete this discussion? Its replies will be removed too.'))) return;
  try {
    await deletePost(route.params.id);
    router.push('/community');
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not delete the discussion.';
  }
}

async function removeComment(comment) {
  if (!(await confirmDelete('Are you sure you want to delete this reply?'))) return;
  try {
    await deleteComment(route.params.id, comment._id);
    post.value.comments = post.value.comments.filter((c) => c._id !== comment._id);
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not delete the reply.';
  }
}

function startEditPost() {
  postDraft.value = {
    title: post.value.title,
    body: post.value.body,
    topic: post.value.topic,
    keepImages: [...(post.value.images || [])],
  };
  newImages.value = [];
  editingPost.value = true;
}

function cancelEditPost() {
  releaseNewImages();
  editingPost.value = false;
  error.value = '';
}

function releaseNewImages() {
  newImages.value.forEach((img) => URL.revokeObjectURL(img.url));
  newImages.value = [];
}

// Keeps the post within the image limit while editing
function onPostImagesSelected(event) {
  const picked = Array.from(event.target.files || []);
  const room = MAX_IMAGES - postDraft.value.keepImages.length - newImages.value.length;

  if (picked.length > room) {
    error.value = `A post can have at most ${MAX_IMAGES} images.`;
  }

  picked.slice(0, Math.max(0, room)).forEach((file) => {
    newImages.value.push({ file, url: URL.createObjectURL(file) });
  });

  if (postFileInput.value) postFileInput.value.value = '';
}

function dropExistingImage(index) {
  postDraft.value.keepImages.splice(index, 1);
}

function dropNewImage(index) {
  URL.revokeObjectURL(newImages.value[index].url);
  newImages.value.splice(index, 1);
}

async function savePost() {
  const title = postDraft.value.title.trim();
  const body = postDraft.value.body.trim();
  if (title.length < 5) {
    error.value = 'Title must be at least 5 characters.';
    return;
  }
  if (body.length < 10) {
    error.value = 'Description must be at least 10 characters.';
    return;
  }

  savingPost.value = true;
  error.value = '';
  try {
    const { data } = await updatePost(route.params.id, {
      title,
      body,
      topic: postDraft.value.topic,
      keepImages: postDraft.value.keepImages,
      images: newImages.value.map((img) => img.file),
    });
    post.value = { ...post.value, ...data };
    releaseNewImages();
    editingPost.value = false;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not update the discussion.';
  } finally {
    savingPost.value = false;
  }
}

function onCommentImageSelected(event) {
  const file = (event.target.files || [])[0];
  if (!file) return;
  clearCommentImage();
  commentImage.value = { file, url: URL.createObjectURL(file) };
}

function clearCommentImage() {
  if (commentImage.value) URL.revokeObjectURL(commentImage.value.url);
  commentImage.value = null;
  if (commentFileInput.value) commentFileInput.value.value = '';
}

function startEditComment(comment) {
  editingCommentId.value = comment._id;
  commentDraft.value = {
    content: comment.content,
    existingImage: comment.image || null,
    newImage: null,
    removeImage: false,
  };
}

function cancelEditComment() {
  if (commentDraft.value.newImage) URL.revokeObjectURL(commentDraft.value.newImage.url);
  editingCommentId.value = null;
  error.value = '';
}

function onEditCommentImageSelected(event) {
  const file = (event.target.files || [])[0];
  if (!file) return;
  if (commentDraft.value.newImage) URL.revokeObjectURL(commentDraft.value.newImage.url);
  commentDraft.value.newImage = { file, url: URL.createObjectURL(file) };
}

async function saveComment(comment) {
  const content = commentDraft.value.content.trim();
  if (!content) {
    error.value = 'Reply cannot be empty.';
    return;
  }

  savingComment.value = true;
  error.value = '';
  try {
    const { data } = await updateComment(route.params.id, comment._id, {
      content,
      image: commentDraft.value.newImage?.file,
      removeImage: commentDraft.value.removeImage,
    });
    const index = post.value.comments.findIndex((c) => c._id === comment._id);
    if (index !== -1) post.value.comments[index] = data;
    cancelEditComment();
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not update the reply.';
  } finally {
    savingComment.value = false;
  }
}

onMounted(load);
</script>
