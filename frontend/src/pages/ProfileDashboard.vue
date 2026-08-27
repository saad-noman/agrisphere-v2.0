<template>
  <div class="profile-dashboard container py-4">
    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>
    <p v-else-if="!authState.user" class="app-alert app-alert-danger">
      Please log in to view your profile dashboard.
    </p>

    <div v-else-if="user" class="auth-card detail-page-card">
      <div class="row">
        <div class="col-md-4 mb-3 text-center">
          <img
            v-if="user.profileImage"
            :src="serverUrl + user.profileImage"
            alt="Profile photo"
            class="expert-photo-large"
          />
          <div v-else class="expert-photo-placeholder">No Photo</div>
        </div>

        <div class="col-md-8">
          <h2>{{ user.name }}</h2>
          <p class="subtitle">{{ roleLabel }}</p>
          <StarRating v-if="expert" :value="expert.ratingAverage || 0" :count="expert.ratingCount || 0" />
          <span v-if="expert?.availabilityStatus" class="status-badge" :class="expert.availabilityStatus === 'available' ? 'status-success' : 'status-neutral'">
            {{ expert.availabilityStatus }}
          </span>
        </div>
      </div>

      <div class="detail-info-grid">
        <div class="detail-info-item">
          <span class="detail-info-label">Email</span>
          <span class="detail-info-value">{{ user.email }}</span>
        </div>
        <div v-if="user.phone" class="detail-info-item">
          <span class="detail-info-label">Phone</span>
          <span class="detail-info-value">{{ user.phone }}</span>
        </div>
        <div v-if="user.district || user.upazila" class="detail-info-item">
          <span class="detail-info-label">Location</span>
          <span class="detail-info-value">{{ user.upazila }} {{ user.district }}</span>
        </div>
        <div v-if="expert?.specialization" class="detail-info-item">
          <span class="detail-info-label">Specialization</span>
          <span class="detail-info-value">{{ expert.specialization }}</span>
        </div>
        <div v-if="expert?.expertiseCategory" class="detail-info-item">
          <span class="detail-info-label">Expertise Category</span>
          <span class="detail-info-value">{{ expert.expertiseCategory }}</span>
        </div>
        <div v-if="expert?.experience" class="detail-info-item">
          <span class="detail-info-label">Experience</span>
          <span class="detail-info-value">{{ expert.experience }} years</span>
        </div>
        <div v-if="expert?.organization" class="detail-info-item">
          <span class="detail-info-label">Organization</span>
          <span class="detail-info-value">{{ expert.organization }}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4>Go to</h4>
        <div class="d-flex gap-2 flex-wrap">
          <router-link v-for="link in navLinks" :key="link.to" :to="link.to" class="btn-pill-outline">
            {{ link.label }}
          </router-link>
        </div>
        <div class="d-flex gap-2 flex-wrap mt-2">
          <router-link to="/profile" class="btn-pill">Edit Profile</router-link>
          <button type="button" class="btn-pill-danger" @click="handleLogout">Logout</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { serverUrl } from '../services/api';
import { getProfile } from '../services/profileService';
import { authState, logout } from '../stores/auth';
import StarRating from '../components/StarRating.vue';

const router = useRouter();
const user = ref(null);
const expert = ref(null);
const error = ref('');

const ROLE_LABELS = {
  farmer: 'Farmer',
  expert: 'Agricultural Expert',
  organization_owner: 'Organization Owner',
  admin: 'Administrator',
};
const roleLabel = computed(() => ROLE_LABELS[user.value?.role] || user.value?.role || '');

// Same destinations already used across the app's navbar, grouped by role.
const COMMON_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Experts', to: '/experts' },
  { label: 'Organizations', to: '/organizations' },
  { label: 'Services Map', to: '/map' },
  { label: 'Weather', to: '/get-weather' },
];
const ROLE_LINKS = {
  farmer: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Farm Records', to: '/farm-records' },
    { label: 'My Consultations', to: '/consultations' },
    { label: 'Messages', to: '/messages' },
    { label: 'AI Crop Disease Analysis', to: '/crop-analysis' },
  ],
  expert: [
    { label: 'Pending Requests', to: '/consultations/pending' },
    { label: 'Consultation Record', to: '/consultations/records' },
    { label: 'Messages', to: '/messages' },
    { label: 'Disease Library', to: '/disease-library' },
  ],
  organization_owner: [
    { label: 'My Organizations', to: '/organizations/mine' },
    { label: 'Add Organization', to: '/organizations/new' },
  ],
};
const navLinks = computed(() => [...COMMON_LINKS, ...(ROLE_LINKS[user.value?.role] || [])]);

onMounted(async () => {
  if (!authState.user) return;
  try {
    const response = await getProfile();
    user.value = response.data.user;
    expert.value = response.data.expert;
  } catch (err) {
    error.value = 'Could not load your profile. Please try again.';
  }
});

function handleLogout() {
  logout();
  router.push('/');
}
</script>
