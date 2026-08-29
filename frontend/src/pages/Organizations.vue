<template>
  <div class="organizations">
    <OrganizationSidebar />

    <div class="container py-4" :class="{ 'org-content-with-sidebar': authState.user?.role === 'organization_owner' }">
      <h2 class="mb-4">Agricultural Organizations</h2>

      <div ref="filterMenuRef" class="nav-dropdown mb-4">
        <button type="button" class="btn-pill-outline" @click="showFilters = !showFilters">
          Filters {{ showFilters ? '▲' : '▼' }}
        </button>
        <div v-if="showFilters" class="nav-dropdown-menu filter-menu">
          <form @submit.prevent="handleSearch">
            <label class="form-label mb-1">Search by name</label>
            <input v-model="filters.search" type="text" class="form-control mb-2" placeholder="Search by name" />

            <label class="form-label mb-1">Category</label>
            <input v-model="filters.category" type="text" class="form-control mb-2" placeholder="Category" />

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

      <p v-if="organizations.length === 0" class="empty-state">
        {{ hasActiveFilters ? 'No organizations match your filters.' : 'No organizations have been added yet.' }}
      </p>
      <ul class="list-group">
        <li
          v-for="org in organizations"
          :key="org._id"
          class="list-group-item d-flex align-items-center"
          style="cursor: pointer"
          @click="goToOrganization(org._id)"
        >
          <img v-if="org.photo" :src="serverUrl + org.photo" alt="" class="org-thumb" />
          <span>
            <span class="plain-link">{{ org.name }}</span>
            <span v-if="org.district"> — {{ org.district }}</span>
            <StarRating :value="org.ratingAverage || 0" :count="org.ratingCount || 0" />
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import { searchOrganizations } from '../services/organizationService';
import OrganizationSidebar from '../components/OrganizationSidebar.vue';
import { useClickOutside } from '../composables/useClickOutside';
import StarRating from '../components/StarRating.vue';

const router = useRouter();
const organizations = ref([]);
const filters = ref({ search: '', category: '', district: '', upazila: '', sort: '' });
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

onMounted(loadOrganizations);

async function loadOrganizations() {
  const response = await searchOrganizations(filters.value);
  organizations.value = response.data;
}

function handleSearch() {
  showFilters.value = false;
  loadOrganizations();
}

function clearFilters() {
  filters.value = { search: '', category: '', district: '', upazila: '', sort: '' };
  showFilters.value = false;
  loadOrganizations();
}

function goToOrganization(id) {
  router.push(`/organizations/${id}`);
}
</script>
