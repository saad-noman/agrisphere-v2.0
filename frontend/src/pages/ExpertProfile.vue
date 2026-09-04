<template>
  <div class="expert-profile container py-4">
    <p v-if="error" class="app-alert app-alert-danger">{{ error }}</p>

    <div v-else-if="expert" class="auth-card detail-page-card">
      <div class="row">
        <div class="col-md-4 mb-3">
          <img
            v-if="expert.profileImage"
            :src="serverUrl + expert.profileImage"
            alt=""
            class="expert-photo-large"
          />
          <div v-else class="expert-photo-placeholder">No Photo</div>
        </div>

        <div class="col-md-8">
          <h2>{{ expert.fullName }}</h2>
          <StarRating :value="expert.ratingAverage || 0" :count="expert.ratingCount || 0" />
          <p v-if="expert.specialization"><strong>Specialization:</strong> {{ expert.specialization }}</p>
          <p v-if="expert.expertiseCategory"><strong>Expertise Category:</strong> {{ expert.expertiseCategory }}</p>
          <p v-if="expert.organization">
            <strong>Organization:</strong>
            &nbsp;<router-link
              v-if="expert.organizationId"
              :to="`/organizations/${expert.organizationId}`"
              class="plain-link"
            >
              {{ expert.organization }}
            </router-link>
            <span v-else>{{ expert.organization }}</span>
          </p>
          <p v-if="expert.experience"><strong>Experience:</strong> {{ expert.experience }} years</p>
          <p v-if="expert.consultationMode"><strong>Consultation Mode:</strong> {{ expert.consultationMode }}</p>
          <p v-if="expert.phone"><strong>Phone:</strong> {{ expert.phone }}</p>
          <p v-if="expert.email"><strong>Email:</strong> {{ expert.email }}</p>
          <p v-if="formatAddress(expert.address)">
            <strong>Location:</strong> {{ formatAddress(expert.address) }}
          </p>
          <p v-if="expert.address"><strong>Address:</strong> {{ expert.address }}</p>

          <div class="d-flex gap-2 flex-wrap">
            <router-link
              v-if="authState.user?.role === 'farmer'"
              :to="`/consultations/request?expertId=${expert._id}`"
              class="btn-pill"
            >
              Request Consultation
            </router-link>
            <router-link
              v-if="authState.user?.role === 'farmer'"
              :to="`/messages?expertId=${expert._id}`"
              class="btn-pill-outline"
            >
              💬 Message
            </router-link>
            <router-link
              v-if="expert.latitude != null && expert.longitude != null"
              :to="{ path: '/map', query: { type: 'expert', id: expert._id } }"
              class="btn-pill-outline"
            >
              View on Map
            </router-link>
          </div>
        </div>
      </div>

      <div v-if="expert.bio" class="detail-section">
        <h4>Biography</h4>
        <p v-for="(paragraph, i) in toList(expert.bio)" :key="i">{{ paragraph }}</p>
      </div>

      <div v-if="expert.qualification" class="detail-section">
        <h4>Academic Qualifications</h4>
        <ul>
          <li v-for="(item, i) in toList(expert.qualification)" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="expert.awards" class="detail-section">
        <h4>Awards and Achievements</h4>
        <ul>
          <li v-for="(item, i) in toList(expert.awards)" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="expert.areasOfExpertise" class="detail-section">
        <h4>Areas of Expertise</h4>
        <ul>
          <li v-for="(item, i) in toList(expert.areasOfExpertise)" :key="i">{{ item }}</li>
        </ul>
      </div>

      <div v-if="expert.researchExperience" class="detail-section">
        <h4>Research / Professional Experience</h4>
        <ul>
          <li v-for="(item, i) in toList(expert.researchExperience)" :key="i">{{ item }}</li>
        </ul>
      </div>

      <RatingSection targetType="expert" :targetId="expert._id" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { serverUrl } from '../services/api';
import { getExpert } from '../services/expertService';
import { authState } from '../stores/auth';
import StarRating from '../components/StarRating.vue';
import RatingSection from '../components/RatingSection.vue';
import { formatAddress, formatShortAddress } from '../utils/address';

const route = useRoute();
const expert = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    const response = await getExpert(route.params.id);
    expert.value = response.data;
  } catch (err) {
    error.value = 'Expert not found.';
  }
});

// Turns a "one item per line" textarea value into a list of non-empty lines.
function toList(text) {
  return text ? text.split('\n').map((line) => line.trim()).filter(Boolean) : [];
}
</script>
