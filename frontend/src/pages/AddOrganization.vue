<template>
  <div class="add-organization auth-page">
    <div class="auth-card detail-page-card">
      <h2>{{ isEditing ? 'Edit Organization' : 'Add Organization' }}</h2>
      <p class="subtitle">
        {{ isEditing ? 'Update your organization details' : 'List your organization on AgriSphere' }}
      </p>

      <form @submit.prevent="handleSubmit">
        <h6 class="page-title">Basic Info</h6>

        <div class="mb-3">
          <label class="form-label">Name</label>
          <input v-model="form.name" type="text" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Photo</label>
          <img v-if="existingPhoto" :src="serverUrl + existingPhoto" alt="" class="org-thumb mb-2 d-block" />
          <button
            v-if="existingPhoto"
            type="button"
            class="btn-pill-danger btn-pill-sm mb-2"
            @click="handlePhotoRemove"
          >
            Remove Photo
          </button>
          <input type="file" accept="image/*" class="form-control" @change="handlePhotoChange" />
        </div>

        <div class="mb-3">
          <label class="form-label">Category</label>
          <input v-model="form.category" type="text" class="form-control" placeholder="e.g. NGO, Cooperative" />
        </div>

        <div class="mb-3">
          <label class="form-label">Description</label>
          <textarea v-model="form.description" class="form-control"></textarea>
        </div>

        <h6 class="page-title mt-4">Location</h6>

        <AddressFields id-prefix="org" :address="form.address" @update:address="form.address = $event" />

        <div class="mb-3">
          <label class="form-label">Latitude</label>
          <input v-model.number="form.latitude" type="number" step="any" class="form-control" placeholder="e.g. 23.8103" />
        </div>

        <div class="mb-3">
          <label class="form-label">Longitude</label>
          <input v-model.number="form.longitude" type="number" step="any" class="form-control" placeholder="e.g. 90.4125" />
          <p class="auth-switch" style="text-align: left; margin-top: 4px">
            Sets this organization's location on the map. Find coordinates on
            <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>.
          </p>
        </div>

        <h6 class="page-title mt-4">Contact</h6>

        <div class="mb-3">
          <label class="form-label">Contact Number</label>
          <input v-model="form.contactNumber" type="text" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Email</label>
          <input v-model="form.email" type="email" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Website</label>
          <input v-model="form.website" type="text" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Opening Hours</label>
          <input v-model="form.openingHours" type="text" class="form-control" placeholder="e.g. Sat-Thu, 9am-5pm" />
        </div>

        <div class="mb-3 form-check">
          <input v-model="form.isConsultationCenter" type="checkbox" class="form-check-input" id="isConsultationCenter" />
          <label class="form-check-label" for="isConsultationCenter">This is a consultation center</label>
        </div>

        <button type="submit" class="btn-pill" :disabled="saving">
          {{ saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Organization' }}
        </button>

        <p v-if="saveError" class="app-alert app-alert-danger">{{ saveError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { serverUrl } from '../services/api';
import AddressFields from '../components/AddressFields.vue';
import { emptyAddress, toAddressForm } from '../utils/address';
import {
  createOrganization,
  updateOrganization,
  getOrganization,
  deleteOrganizationPhoto,
} from '../services/organizationService';

const route = useRoute();
const router = useRouter();
const isEditing = computed(() => !!route.params.id);

const form = ref({
  name: '',
  photo: null,
  category: '',
  description: '',
  address: emptyAddress(),
  latitude: null,
  longitude: null,
  contactNumber: '',
  email: '',
  website: '',
  openingHours: '',
  isConsultationCenter: false,
});
const existingPhoto = ref('');
const saving = ref(false);
const saveError = ref('');

onMounted(async () => {
  if (!isEditing.value) return;

  const response = await getOrganization(route.params.id);
  const org = response.data;

  form.value.name = org.name || '';
  form.value.category = org.category || '';
  form.value.description = org.description || '';
  form.value.address = toAddressForm(org.address);
  form.value.latitude = org.latitude ?? null;
  form.value.longitude = org.longitude ?? null;
  form.value.contactNumber = org.contactNumber || '';
  form.value.email = org.email || '';
  form.value.website = org.website || '';
  form.value.openingHours = org.openingHours || '';
  form.value.isConsultationCenter = org.isConsultationCenter || false;
  existingPhoto.value = org.photo || '';
});

function handlePhotoChange(event) {
  form.value.photo = event.target.files[0] || null;
}

async function handlePhotoRemove() {
  saveError.value = '';

  try {
    await deleteOrganizationPhoto(route.params.id);
    existingPhoto.value = '';
  } catch (err) {
    saveError.value = err.response?.data?.message || 'Could not remove photo. Please try again.';
  }
}

async function handleSubmit() {
  saveError.value = '';
  saving.value = true;

  try {
    if (isEditing.value) {
      await updateOrganization(route.params.id, form.value);
    } else {
      await createOrganization(form.value);
    }
    router.push('/organizations/mine');
  } catch (err) {
    saveError.value = err.response?.data?.message || 'Could not save organization. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>
