<template>
  <div class="rating-section">
    <h4>Ratings & Reviews</h4>

    <div class="rating-summary">
      <StarRating :value="average" :count="count" />
    </div>

    <p v-if="loadError" class="app-alert app-alert-danger">{{ loadError }}</p>

    <div v-if="authState.user?.role === 'farmer'" class="rating-form">
      <template v-if="!eligible">
        <p class="text-muted mb-0">
          You can rate this expert after completing a consultation with them.
        </p>
      </template>
      <template v-else>
        <p class="fw-bold mb-2">{{ myRating ? 'Your review' : 'Write a review' }}</p>
        <StarRating :value="form.score" interactive @change="form.score = $event" />
        <textarea
          v-model="form.comment"
          class="form-control mt-2"
          rows="3"
          maxlength="1000"
          placeholder="Share your experience (optional)"
        ></textarea>
        <p v-if="formError" class="app-alert app-alert-danger mt-2 mb-0">{{ formError }}</p>
        <div class="d-flex gap-2 mt-2">
          <button type="button" class="btn-pill" :disabled="submitting || !form.score" @click="submit">
            {{ myRating ? 'Update review' : 'Post review' }}
          </button>
          <button
            v-if="myRating"
            type="button"
            class="btn-pill-secondary"
            :disabled="submitting"
            @click="remove"
          >
            Delete review
          </button>
        </div>
      </template>
    </div>

    <p v-if="!loading && ratings.length === 0" class="empty-state">No reviews yet.</p>

    <div v-for="review in ratings" :key="review._id" class="rating-list-item">
      <div class="d-flex justify-content-between align-items-start">
        <span class="rating-author">{{ review.farmerId?.name || 'Anonymous farmer' }}</span>
        <span class="rating-date">{{ formatDate(review.createdAt) }}</span>
      </div>
      <StarRating :value="review.score" />
      <p v-if="review.comment" class="rating-comment">{{ review.comment }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import StarRating from './StarRating.vue';
import { getRatings, getMyRating, submitRating, deleteRating } from '../services/ratingService';
import { authState } from '../stores/auth';

const props = defineProps({
  targetType: { type: String, required: true }, // 'expert' | 'organization'
  targetId: { type: String, required: true },
});

const average = ref(0);
const count = ref(0);
const ratings = ref([]);
const myRating = ref(null);
const eligible = ref(props.targetType === 'organization');
const loading = ref(true);
const loadError = ref('');
const submitting = ref(false);
const formError = ref('');
const form = ref({ score: 0, comment: '' });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const response = await getRatings(props.targetType, props.targetId);
    average.value = response.data.average;
    count.value = response.data.count;
    ratings.value = response.data.ratings;

    if (authState.user?.role === 'farmer') {
      const mine = await getMyRating(props.targetType, props.targetId);
      myRating.value = mine.data.rating;
      eligible.value = mine.data.eligible;
      if (mine.data.rating) {
        form.value = { score: mine.data.rating.score, comment: mine.data.rating.comment || '' };
      }
    }
  } catch (err) {
    loadError.value = 'Could not load ratings.';
  } finally {
    loading.value = false;
  }
}

async function submit() {
  formError.value = '';
  submitting.value = true;
  try {
    await submitRating(props.targetType, props.targetId, form.value.score, form.value.comment);
    await load();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not submit your review.';
  } finally {
    submitting.value = false;
  }
}

async function remove() {
  if (!myRating.value) return;
  submitting.value = true;
  try {
    await deleteRating(myRating.value._id);
    form.value = { score: 0, comment: '' };
    await load();
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not delete your review.';
  } finally {
    submitting.value = false;
  }
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}
</script>
