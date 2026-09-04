<template>
  <div class="profile auth-page">
    <div class="auth-card" style="max-width: 600px">
      <h2>Edit Profile</h2>
      <p class="subtitle">Update your account details</p>

      <div class="mb-3" style="text-align: center">
        <img
          v-if="photoUrl"
          :src="photoUrl"
          alt="Profile photo"
          style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-bottom: 10px"
        />
        <input type="file" accept="image/*" class="form-control" @change="handlePhotoChange" />
        <button
          type="button"
          class="btn-pill-outline mt-2"
          :disabled="!selectedPhoto || uploadingPhoto"
          @click="handlePhotoUpload"
        >
          {{ uploadingPhoto ? 'Uploading...' : 'Upload Photo' }}
        </button>
        <button
          v-if="photoUrl"
          type="button"
          class="btn-pill-danger btn-pill-sm mt-2 ms-2"
          @click="handlePhotoDelete"
        >
          Delete Photo
        </button>
        <p v-if="photoError" class="error-text">{{ photoError }}</p>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label">Name</label>
          <input v-model="name" type="text" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Email</label>
          <input :value="email" type="email" class="form-control" disabled />
        </div>

        <div class="mb-3">
          <label class="form-label">Phone</label>
          <input v-model="phone" type="text" class="form-control" />
        </div>

        <AddressFields id-prefix="profile" :address="address" @update:address="address = $event" />

        <template v-if="authState.user?.role === 'expert'">
          <hr />
          <p class="subtitle">Expert Details</p>

          <div class="mb-3">
            <StarRating :value="ratingAverage" :count="ratingCount" />
          </div>

          <div class="mb-3">
            <label class="form-label">Specialization</label>
            <input v-model="specialization" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Expertise Category</label>
            <input v-model="expertiseCategory" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Biography</label>
            <textarea v-model="bio" class="form-control" rows="3" placeholder="A short professional biography"></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Academic Qualifications</label>
            <textarea
              v-model="qualification"
              class="form-control"
              rows="3"
              placeholder="One qualification per line"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Awards and Achievements</label>
            <textarea v-model="awards" class="form-control" rows="3" placeholder="One award per line"></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Areas of Expertise</label>
            <textarea
              v-model="areasOfExpertise"
              class="form-control"
              rows="3"
              placeholder="One area per line"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Research / Professional Experience</label>
            <textarea
              v-model="researchExperience"
              class="form-control"
              rows="3"
              placeholder="One entry per line (optional)"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Experience (years)</label>
            <input v-model.number="experience" type="number" min="0" class="form-control" />
          </div>

          <div ref="organizationFieldRef" class="mb-3">
            <label class="form-label">Organization</label>
            <input
              v-model="organization"
              type="text"
              class="form-control"
              placeholder="Search an organization, or type a name if not listed"
              @input="handleOrganizationInput"
            />
            <ul v-if="organizationResults.length" class="list-group mt-1">
              <li
                v-for="org in organizationResults"
                :key="org._id"
                class="list-group-item list-group-item-action"
                style="cursor: pointer"
                @click="selectOrganization(org)"
              >
                {{ org.name }}
              </li>
            </ul>
            <p v-if="organizationId" class="auth-switch" style="text-align: left; margin-top: 4px">
              Linked to an existing organization.
            </p>
          </div>

          <div class="mb-3">
            <label class="form-label">Consultation Mode</label>
            <select v-model="consultationMode" class="form-select">
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Availability</label>
            <select v-model="availabilityStatus" class="form-select">
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label" for="fee-type">{{ t('fee.consultationFee') }}</label>
            <select id="fee-type" v-model="consultationFeeType" class="form-select">
              <option value="free">{{ t('fee.free') }}</option>
              <option value="paid">{{ t('fee.paid') }}</option>
            </select>
          </div>

          <template v-if="consultationFeeType === 'paid'">
            <div class="mb-3">
              <label class="form-label" for="fee-amount">{{ t('fee.amount') }}</label>
              <input id="fee-amount" v-model.number="consultationFee" type="number" min="0" step="1" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="fee-note">{{ t('fee.note') }}</label>
              <input id="fee-note" v-model="consultationFeeNote" type="text" maxlength="160" class="form-control"
                :placeholder="t('fee.notePlaceholder')" />
            </div>
          </template>

          <div class="mb-3">
            <label class="form-label">Latitude</label>
            <input v-model.number="latitude" type="number" step="any" class="form-control" placeholder="e.g. 23.8103" />
          </div>

          <div class="mb-3">
            <label class="form-label">Longitude</label>
            <input v-model.number="longitude" type="number" step="any" class="form-control" placeholder="e.g. 90.4125" />
            <p class="auth-switch" style="text-align: left; margin-top: 4px">
              Sets your location on the map. Find your coordinates on
              <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>.
            </p>
          </div>
        </template>

        <button type="submit" class="btn-pill" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save Changes' }}
        </button>

        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="success" class="auth-switch">Profile updated successfully.</p>
      </form>

      <hr />
      <button type="button" class="btn-pill-danger w-100" @click="handleAccountDelete">
        Delete My Account
      </button>
      <p v-if="deleteError" class="error-text">{{ deleteError }}</p>
    </div>
  </div>

    <div v-if="authState.user?.role === 'farmer'" class="card mb-3">
      <div class="card-body">
        <h3 class="h5 mb-2">{{ t('marketplace.sellers') }}</h3>
        <label class="d-flex align-items-center gap-2 mb-1">
          <input v-model="isPublic" type="checkbox" @change="save" />
          <span>{{ t('account.publicProfile') }}</span>
        </label>
        <p class="text-muted small mb-0">{{ t('account.publicProfileHint') }}</p>
      </div>
    </div>

    <ChangePassword />

</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState, setUser, logout } from '../stores/auth';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  deleteProfile,
} from '../services/profileService';
import { searchOrganizations } from '../services/organizationService';
import { serverUrl } from '../services/api';
import { useClickOutside } from '../composables/useClickOutside';
import StarRating from '../components/StarRating.vue';

import { confirmDelete } from '../stores/confirm';
import AddressFields from '../components/AddressFields.vue';
import { emptyAddress, toAddressForm } from '../utils/address';
import ChangePassword from '../components/ChangePassword.vue';
import { t } from '../i18n';
const router = useRouter();
const deleteError = ref('');
const organizationFieldRef = ref(null);
useClickOutside(organizationFieldRef, () => {
  organizationResults.value = [];
});

const name = ref('');
const email = ref('');
const phone = ref('');
const address = ref(emptyAddress());

const profileImage = ref('');
const photoUrl = computed(() => (profileImage.value ? serverUrl + profileImage.value : ''));
const selectedPhoto = ref(null);
const uploadingPhoto = ref(false);
const photoError = ref('');

const specialization = ref('');
const expertiseCategory = ref('');
const qualification = ref('');
const bio = ref('');
const awards = ref('');
const areasOfExpertise = ref('');
const researchExperience = ref('');
const experience = ref(null);
const organization = ref('');
const organizationId = ref(null);
const organizationResults = ref([]);
const consultationMode = ref('both');
const availabilityStatus = ref('available');
const consultationFeeType = ref('free');
const consultationFee = ref(0);
const consultationFeeNote = ref('');
const isPublic = ref(false);
const latitude = ref(null);
const longitude = ref(null);
const ratingAverage = ref(0);
const ratingCount = ref(0);

const loading = ref(false);
const error = ref('');
const success = ref(false);

onMounted(async () => {
  try {
    const response = await getProfile();
    const { user, expert } = response.data;

    name.value = user.name;
    email.value = user.email;
    phone.value = user.phone || '';
    address.value = toAddressForm(user.address);
    isPublic.value = Boolean(user.isPublic);
    profileImage.value = user.profileImage || '';

    if (expert) {
      specialization.value = expert.specialization || '';
      expertiseCategory.value = expert.expertiseCategory || '';
      qualification.value = expert.qualification || '';
      bio.value = expert.bio || '';
      awards.value = expert.awards || '';
      areasOfExpertise.value = expert.areasOfExpertise || '';
      researchExperience.value = expert.researchExperience || '';
      experience.value = expert.experience ?? null;
      organization.value = expert.organization || '';
      organizationId.value = expert.organizationId || null;
      consultationMode.value = expert.consultationMode || 'both';
      consultationFeeType.value = expert.consultationFeeType || 'free';
      consultationFee.value = expert.consultationFee || 0;
      consultationFeeNote.value = expert.consultationFeeNote || '';
      availabilityStatus.value = expert.availabilityStatus || 'available';
      latitude.value = expert.latitude ?? null;
      longitude.value = expert.longitude ?? null;
      ratingAverage.value = expert.ratingAverage || 0;
      ratingCount.value = expert.ratingCount || 0;
    }
  } catch (err) {
    error.value = 'Could not load your profile. Please try again.';
  }
});

function handlePhotoChange(event) {
  selectedPhoto.value = event.target.files[0] || null;
}

async function handlePhotoUpload() {
  photoError.value = '';
  uploadingPhoto.value = true;

  try {
    const response = await uploadProfilePhoto(selectedPhoto.value);
    profileImage.value = response.data.user.profileImage;
    setUser(response.data.user);
    selectedPhoto.value = null;
  } catch (err) {
    photoError.value = err.response?.data?.message || 'Could not upload photo. Please try again.';
  } finally {
    uploadingPhoto.value = false;
  }
}

async function handlePhotoDelete() {
  photoError.value = '';

  try {
    const response = await deleteProfilePhoto();
    profileImage.value = '';
    setUser(response.data.user);
  } catch (err) {
    photoError.value = err.response?.data?.message || 'Could not delete photo. Please try again.';
  }
}

async function handleAccountDelete() {
  deleteError.value = '';

  const confirmed = await confirmDelete(
    'This will permanently delete your account and cannot be undone. Are you sure?',
    { title: 'Delete account', confirmText: 'Delete account' }
  );
  if (!confirmed) return;

  try {
    await deleteProfile();
    logout();
    router.push('/');
  } catch (err) {
    deleteError.value = err.response?.data?.message || 'Could not delete account. Please try again.';
  }
}

// Typing means the organization is no longer confirmed as a linked one,
// unless the user clicks one of the matching results below.
async function handleOrganizationInput() {
  organizationId.value = null;

  if (!organization.value) {
    organizationResults.value = [];
    return;
  }

  const response = await searchOrganizations({ search: organization.value });
  organizationResults.value = response.data;
}

function selectOrganization(org) {
  organization.value = org.name;
  organizationId.value = org._id;
  organizationResults.value = [];
}

async function handleSubmit() {
  error.value = '';
  success.value = false;
  loading.value = true;

  try {
    const response = await updateProfile({
      name: name.value,
      phone: phone.value,
      address: address.value,
      specialization: specialization.value,
      expertiseCategory: expertiseCategory.value,
      qualification: qualification.value,
      bio: bio.value,
      awards: awards.value,
      areasOfExpertise: areasOfExpertise.value,
      researchExperience: researchExperience.value,
      experience: experience.value,
      organization: organization.value,
      organizationId: organizationId.value,
      consultationMode: consultationMode.value,
      availabilityStatus: availabilityStatus.value,
      consultationFeeType: consultationFeeType.value,
      consultationFee: consultationFee.value,
      consultationFeeNote: consultationFeeNote.value,
      isPublic: isPublic.value,
      latitude: latitude.value,
      longitude: longitude.value,
    });

    setUser(response.data.user);
    success.value = true;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not update profile. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>
