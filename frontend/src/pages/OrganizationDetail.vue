<template>
  <div class="organization-detail container py-4">
    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div v-else-if="organization" class="auth-card detail-page-card">
      <div class="row">
        <div class="col-md-4 mb-3">
          <img
            v-if="organization.photo"
            :src="serverUrl + organization.photo"
            alt=""
            class="expert-photo-large"
          />
          <div v-else class="expert-photo-placeholder">No Photo</div>
        </div>

        <div class="col-md-8">
          <h2>{{ organization.name }}</h2>
          <StarRating :value="organization.ratingAverage || 0" :count="organization.ratingCount || 0" />
          <p v-if="organization.category" class="subtitle">{{ organization.category }}</p>
          <p v-if="organization.description">{{ organization.description }}</p>

          <router-link
            v-if="organization.latitude != null && organization.longitude != null"
            :to="{ path: '/map', query: { type: 'org', id: organization._id } }"
            class="btn-pill-outline"
          >
            View on Map
          </router-link>
        </div>
      </div>

      <div class="detail-info-grid">
        <div v-if="organization.address" class="detail-info-item">
          <span class="detail-info-label">Address</span>
          <span class="detail-info-value">{{ organization.address }}</span>
        </div>
        <div v-if="organization.district || organization.upazila" class="detail-info-item">
          <span class="detail-info-label">Location</span>
          <span class="detail-info-value">{{ organization.upazila }} {{ organization.district }}</span>
        </div>
        <div v-if="organization.contactNumber" class="detail-info-item">
          <span class="detail-info-label">Contact</span>
          <span class="detail-info-value">{{ organization.contactNumber }}</span>
        </div>
        <div v-if="organization.email" class="detail-info-item">
          <span class="detail-info-label">Email</span>
          <span class="detail-info-value">{{ organization.email }}</span>
        </div>
        <div v-if="organization.website" class="detail-info-item">
          <span class="detail-info-label">Website</span>
          <span class="detail-info-value">
            <a :href="websiteUrl" target="_blank" rel="noopener">{{ organization.website }}</a>
          </span>
        </div>
        <div v-if="organization.openingHours" class="detail-info-item">
          <span class="detail-info-label">Opening Hours</span>
          <span class="detail-info-value">{{ organization.openingHours }}</span>
        </div>
        <div v-if="organization.isConsultationCenter" class="detail-info-item">
          <span class="detail-info-label">Consultation Center</span>
          <span class="detail-info-value">Yes</span>
        </div>
      </div>

      <RatingSection targetType="organization" :targetId="organization._id" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { serverUrl } from '../services/api';
import { getOrganization } from '../services/organizationService';
import StarRating from '../components/StarRating.vue';
import RatingSection from '../components/RatingSection.vue';

const route = useRoute();
const organization = ref(null);
const error = ref('');

const websiteUrl = computed(() => {
  const site = organization.value?.website || '';
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
});

onMounted(async () => {
  try {
    const response = await getOrganization(route.params.id);
    organization.value = response.data;
  } catch (err) {
    error.value = 'Organization not found.';
  }
});
</script>
