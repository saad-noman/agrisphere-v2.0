<template>
  <div class="organizations">
    <OrganizationSidebar />

    <div class="container py-4" :class="{ 'org-content-with-sidebar': authState.user?.role === 'organization_owner' }">
      <h2 class="mb-4">My Organizations</h2>

      <p v-if="organizations.length === 0" class="empty-state">You haven't added any organizations yet.</p>
      <ul class="list-group">
        <li
          v-for="org in organizations"
          :key="org._id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <span class="d-flex align-items-center">
            <img v-if="org.photo" :src="serverUrl + org.photo" alt="" class="org-thumb" />
            <span>
              <router-link :to="`/organizations/${org._id}`" class="plain-link">{{ org.name }}</router-link>
              <span v-if="formatShortAddress(org.address)"> — {{ formatShortAddress(org.address) }}</span>
            </span>
          </span>
          <span>
            <router-link :to="`/organizations/edit/${org._id}`" class="btn-pill-secondary btn-pill-sm me-2">
              Edit
            </router-link>
            <button type="button" class="btn-pill-danger btn-pill-sm" @click="handleDelete(org)">
              Delete
            </button>
          </span>
        </li>
      </ul>
      <p v-if="deleteError" class="error-text">{{ deleteError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { authState } from '../stores/auth';
import { serverUrl } from '../services/api';
import { getMyOrganizations, deleteOrganization } from '../services/organizationService';
import OrganizationSidebar from '../components/OrganizationSidebar.vue';

import { confirmDelete } from '../stores/confirm';
import { formatAddress, formatShortAddress } from '../utils/address';
const organizations = ref([]);
const deleteError = ref('');

onMounted(async () => {
  const response = await getMyOrganizations();
  organizations.value = response.data;
});

async function handleDelete(org) {
  deleteError.value = '';

  const confirmed = await confirmDelete(`Are you sure you want to delete "${org.name}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await deleteOrganization(org._id);
    organizations.value = organizations.value.filter((item) => item._id !== org._id);
  } catch (err) {
    deleteError.value = err.response?.data?.message || 'Could not delete organization. Please try again.';
  }
}
</script>
