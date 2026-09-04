<template>
  <div class="expert-search container py-4">
    <h2 class="mb-4">Agricultural Experts</h2>

    <div ref="filterMenuRef" class="nav-dropdown mb-4">
      <button type="button" class="btn-pill-outline" @click="showFilters = !showFilters">
        Filters {{ showFilters ? '▲' : '▼' }}
      </button>
      <div v-if="showFilters" class="nav-dropdown-menu filter-menu">
        <form @submit.prevent="handleSearch">
          <label class="form-label mb-1">Search by name</label>
          <input v-model="filters.search" type="text" class="form-control mb-2" placeholder="Search by name" />

          <label class="form-label mb-1">Specialization</label>
          <input v-model="filters.specialization" type="text" class="form-control mb-2" placeholder="Specialization" />

          <label class="form-label mb-1">District</label>
          <input v-model="filters.district" type="text" class="form-control mb-2" placeholder="District" />

          <label class="form-label mb-1">Upazila</label>
          <input v-model="filters.upazila" type="text" class="form-control mb-2" placeholder="Upazila" />

          <label class="form-label mb-1">Sort by</label>
          <select v-model="filters.sort" class="form-control mb-2">
            <option value="">Name</option>
            <option value="rating">Highest rated</option>
          </select>

          <div class="d-flex gap-2 mt-2">
            <button type="submit" class="btn-pill">Search</button>
            <button type="button" class="btn-pill-secondary" @click="clearFilters">Clear Filters</button>
          </div>
        </form>
      </div>
    </div>

    <p v-if="experts.length === 0" class="empty-state">
      {{ hasActiveFilters ? 'No experts match your filters.' : 'No experts found.' }}
    </p>
    <div class="list-group">
      <div
        v-for="expert in experts"
        :key="expert._id"
        class="list-group-item d-flex align-items-center gap-3"
        style="cursor: pointer"
        @click="goToExpert(expert._id)"
      >
        <img v-if="expert.profileImage" :src="serverUrl + expert.profileImage" alt="" class="org-thumb" />
        <div>
          <div class="fw-bold">{{ expert.fullName }}</div>
          <StarRating :value="expert.ratingAverage || 0" :count="expert.ratingCount || 0" />
          <div v-if="expert.specialization">{{ expert.specialization }}</div>
          <div v-if="formatShortAddress(expert.address)" class="text-muted small">
            {{ formatShortAddress(expert.address) }}
          </div>
          <div v-if="expert.experience" class="text-muted small">{{ expert.experience }} years experience</div>
          <div v-if="expert.organization" class="small">
            <router-link
              v-if="expert.organizationId"
              :to="`/organizations/${expert.organizationId}`"
              class="plain-link"
              @click.stop
            >
              {{ expert.organization }}
            </router-link>
            <span v-else>{{ expert.organization }}</span>
          </div>
          <span class="status-badge" :class="expert.availabilityStatus === 'available' ? 'status-success' : 'status-neutral'">
            {{ expert.availabilityStatus }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { serverUrl } from '../services/api';
import { searchExperts } from '../services/expertService';
import { useClickOutside } from '../composables/useClickOutside';
import StarRating from '../components/StarRating.vue';
import { formatAddress, formatShortAddress } from '../utils/address';

const router = useRouter();
const experts = ref([]);
const filters = ref({ search: '', specialization: '', district: '', upazila: '', sort: '' });
const showFilters = ref(false);
const filterMenuRef = ref(null);
useClickOutside(filterMenuRef, () => {
  showFilters.value = false;
});

const hasActiveFilters = computed(function () {
  const values = Object.values(filters.value);

  for (let i = 0; i < values.length; i++) {
    if (values[i].trim() !== '') {
      return true;
    }
  }

  return false;
});

onMounted(loadExperts);

async function loadExperts() {
  const response = await searchExperts(filters.value);
  experts.value = response.data;
}

function handleSearch() {
  showFilters.value = false;
  loadExperts();
}

function clearFilters() {
  filters.value = { search: '', specialization: '', district: '', upazila: '', sort: '' };
  showFilters.value = false;
  loadExperts();
}

function goToExpert(id) {
  router.push(`/experts/${id}`);
}
</script>
