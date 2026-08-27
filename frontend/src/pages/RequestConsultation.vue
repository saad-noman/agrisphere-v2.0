<template>
  <div class="request-consultation container py-4">
    <h2 class="mb-4">Request Consultation</h2>

    <div class="auth-card mb-4" style="max-width: 600px">
      <form @submit.prevent="handleSubmit">
        <div ref="expertFieldRef" class="mb-3">
          <label class="form-label">Expert</label>
          <input
            v-model="expertSearch"
            type="text"
            class="form-control"
            placeholder="Search an expert by name or specialization"
            @input="handleExpertSearch"
          />
          <ul v-if="expertResults.length" class="list-group mt-1">
            <li
              v-for="expert in expertResults"
              :key="expert._id"
              class="list-group-item list-group-item-action"
              style="cursor: pointer"
              @click="selectExpert(expert)"
            >
              {{ expert.fullName }} <span v-if="expert.specialization">— {{ expert.specialization }}</span>
            </li>
          </ul>
          <p v-if="selectedExpert" class="auth-switch" style="text-align: left; margin-top: 4px">
            Selected: {{ selectedExpert.fullName }}
          </p>
          <p v-if="selectedExpert?.availabilityStatus === 'unavailable'" class="error-text" style="margin-top: 4px">
            This expert is currently marked unavailable. You can still submit a request, but a response may be delayed.
          </p>
        </div>

        <div class="mb-3">
          <label class="form-label">Consultation Title</label>
          <input v-model="form.title" type="text" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Crop Type</label>
          <input v-model="form.cropType" type="text" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Subject / Category</label>
          <input v-model="form.subject" type="text" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Problem Description</label>
          <textarea v-model="form.description" class="form-control" rows="4"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">Consultation Mode</label>
          <select v-model="form.consultationType" class="form-select" required>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label">Preferred Date (optional)</label>
          <input v-model="form.preferredDateOnly" type="date" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Preferred Time (optional)</label>
          <input v-model="form.preferredTimeOnly" type="time" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Attach an Image (optional)</label>
          <input type="file" accept="image/*" class="form-control" @change="handleFileChange" />
        </div>

        <button type="submit" class="btn-pill" :disabled="submitting">
          {{ submitting ? 'Submitting...' : 'Submit Request' }}
        </button>

        <p v-if="submitError" class="app-alert app-alert-danger">{{ submitError }}</p>
        <p v-if="submitSuccess" class="app-alert app-alert-success">Request submitted successfully.</p>
      </form>
    </div>

    <h4 class="mb-3">Your Requests</h4>
    <p v-if="myRequests.length === 0" class="empty-state">You haven't submitted any requests yet.</p>
    <ul class="list-group my-requests-list" style="max-width: 600px">
      <li v-for="request in myRequests" :key="request._id" class="list-group-item">
        <div class="fw-bold">{{ request.title }}</div>
        <div class="text-muted small">To: {{ request.expertId?.fullName }}</div>
        <span class="status-badge" :class="statusBadgeClass(request.status)">{{ request.status }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { searchExperts, getExpert } from '../services/expertService';
import { createConsultationRequest, getMyRequests } from '../services/consultationService';
import { useClickOutside } from '../composables/useClickOutside';

const route = useRoute();

const expertSearch = ref('');
const expertResults = ref([]);
const selectedExpert = ref(null);
const expertFieldRef = ref(null);
useClickOutside(expertFieldRef, () => {
  expertResults.value = [];
});

const emptyForm = () => ({
  title: '',
  cropType: '',
  subject: '',
  description: '',
  consultationType: 'online',
  preferredDateOnly: '',
  preferredTimeOnly: '',
  attachment: null,
});
const form = ref(emptyForm());

const submitting = ref(false);
const submitError = ref('');
const submitSuccess = ref(false);
const myRequests = ref([]);

onMounted(async () => {
  await loadMyRequests();

  if (route.query.expertId) {
    try {
      const response = await getExpert(route.query.expertId);
      selectExpert(response.data);
    } catch (err) {
      // Ignore an invalid/expired expertId in the query string; the user can still search manually.
    }
  }
});

async function loadMyRequests() {
  const response = await getMyRequests();
  myRequests.value = response.data;
}

async function handleExpertSearch() {
  selectedExpert.value = null;
  if (!expertSearch.value) {
    expertResults.value = [];
    return;
  }
  const response = await searchExperts({ search: expertSearch.value });
  expertResults.value = response.data;
}

function selectExpert(expert) {
  selectedExpert.value = expert;
  expertSearch.value = expert.fullName;
  expertResults.value = [];
}

function handleFileChange(event) {
  form.value.attachment = event.target.files[0] || null;
}

function statusBadgeClass(status) {
  if (status === 'approved' || status === 'completed') return 'status-success';
  if (status === 'rejected' || status === 'cancelled') return 'status-danger';
  if (status === 'rescheduled') return 'status-warning';
  return 'status-neutral';
}

async function handleSubmit() {
  submitError.value = '';
  submitSuccess.value = false;

  if (!selectedExpert.value) {
    submitError.value = 'Please select an expert.';
    return;
  }

  submitting.value = true;

  try {
    let preferredDate = null;
    if (form.value.preferredDateOnly) {
      preferredDate = `${form.value.preferredDateOnly}T${form.value.preferredTimeOnly || '00:00'}`;
    }

    await createConsultationRequest({
      expertId: selectedExpert.value._id,
      title: form.value.title,
      cropType: form.value.cropType,
      subject: form.value.subject,
      description: form.value.description,
      consultationType: form.value.consultationType,
      preferredDate,
      attachment: form.value.attachment,
    });

    submitSuccess.value = true;
    form.value = emptyForm();
    selectedExpert.value = null;
    expertSearch.value = '';
    await loadMyRequests();
  } catch (err) {
    submitError.value = err.response?.data?.message || 'Could not submit request. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>
