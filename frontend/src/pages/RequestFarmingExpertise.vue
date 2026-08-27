<script setup>
import { ref, onMounted } from 'vue';
import api, { serverUrl as apiBase } from '../services/api';
import { authState } from '../stores/auth';

const requests = ref([]);
const selectedRequestId = ref(null);
const selectedRequest = ref(null);
const rightMode = ref('request_details'); // 'new_request' or 'request_details'
const isRequestsExpanded = ref(true);

const loadingRequests = ref(true);
const loadingDetails = ref(false);
const submitting = ref(false);

const cropName = ref('');
const comment = ref('');

const errorMessage = ref('');
const successMessage = ref('');

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`,
  };
}

async function loadRequests() {
  loadingRequests.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/farming-expertise', {
      headers: authHeader(),
    });
    requests.value = response.data;

    if (requests.value.length > 0 && !selectedRequestId.value) {
      await selectRequest(requests.value[0]._id);
    } else if (requests.value.length === 0) {
      rightMode.value = 'new_request';
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load farming expertise requests.';
  } finally {
    loadingRequests.value = false;
  }
}

async function selectRequest(id) {
  selectedRequestId.value = id;
  rightMode.value = 'request_details';
  loadingDetails.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get(`/farming-expertise/${id}`, {
      headers: authHeader(),
    });
    selectedRequest.value = response.data;
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load request details.';
  } finally {
    loadingDetails.value = false;
  }
}

function openNewRequestForm() {
  selectedRequestId.value = null;
  selectedRequest.value = null;
  rightMode.value = 'new_request';
  errorMessage.value = '';
  successMessage.value = '';
}

function toggleRequestsList() {
  isRequestsExpanded.value = !isRequestsExpanded.value;
  if (isRequestsExpanded.value) {
    rightMode.value = 'request_details';
    if (requests.value.length > 0 && !selectedRequestId.value) {
      selectRequest(requests.value[0]._id);
    }
  }
}

async function handleSubmitRequest() {
  if (!cropName.value.trim()) {
    errorMessage.value = 'Crop Name is required.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await api.post(
      '/farming-expertise',
      {
        cropName: cropName.value.trim(),
        comment: comment.value.trim(),
      },
      { headers: authHeader() }
    );

    successMessage.value = 'Farming expertise request submitted successfully!';
    cropName.value = '';
    comment.value = '';
    isRequestsExpanded.value = true;

    // Reload list and select new request
    await loadRequests();
    if (response.data.request?._id) {
      await selectRequest(response.data.request._id);
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = err.response?.data?.message || 'Failed to submit request.';
  } finally {
    submitting.value = false;
  }
}

function isPdf(url) {
  return url && url.toLowerCase().endsWith('.pdf');
}

function isStockCrop(response) {
  if (!response) return false;
  if (response.attachmentType === 'stock_image') return true;
  if (response.attachment && response.attachment.toLowerCase().includes('/stock-crops/')) return true;
  return false;
}

function getCleanFileName(url) {
  if (!url) return '';
  const filename = url.split('/').pop() || url;
  const clean = filename.replace(/^[0-9]+-[0-9]+-/, '');
  const name = clean.replace(/\.[^/.]+$/, '');
  return (name || 'Attached File').replace(/_/g, ' ');
}

onMounted(loadRequests);
</script>

<template>
  <div class="farming-expertise-page">
    <div class="container py-4">
      <div class="mb-4">
        <h1 class="page-title">Request Farming Expertise</h1>
        <p class="text-muted">
          Ask our agricultural experts for specialized guidance regarding your crops.
        </p>
      </div>

      <div v-if="errorMessage" class="app-alert app-alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="app-alert app-alert-success mb-4">
        {{ successMessage }}
      </div>

      <div class="row">
        <!-- LEFT COLUMN: NAVIGATION & REQUEST LIST -->
        <div class="col-lg-4 mb-4">
          <!-- 1. Submit New Request Button -->
          <button
            type="button"
            class="btn w-100 py-3 mb-4 fw-bold shadow-sm d-flex justify-content-between align-items-center"
            :class="rightMode === 'new_request' ? 'btn-success' : 'btn-outline-success bg-white'"
            @click="openNewRequestForm"
          >
            <span>+ Submit New Request</span>
            <span
              class="badge px-2 py-1"
              :class="rightMode === 'new_request' ? 'bg-white text-success' : 'bg-success text-white'"
            >
              Form
            </span>
          </button>

          <!-- 2. My Past Requests List Card -->
          <div class="card shadow-sm border-0">
            <div
              class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center cursor-pointer"
              :class="{ 'border-success': rightMode === 'request_details' }"
              @click="toggleRequestsList"
            >
              <div class="d-flex align-items-center gap-2">
                <h5 class="mb-0 fw-bold" :class="{ 'text-success': rightMode === 'request_details' }">My Requests</h5>
                <span class="badge bg-secondary">{{ requests.length }}</span>
              </div>
              <span class="badge bg-light text-dark border">
                {{ isRequestsExpanded ? '▲ Hide' : '▼ Show' }}
              </span>
            </div>

            <div v-if="isRequestsExpanded">
              <div v-if="loadingRequests" class="card-body text-center py-4">
                <div class="spinner-border text-success" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>

              <div v-else-if="requests.length === 0" class="card-body text-center py-4 text-muted">
                No requests submitted yet. Click <strong>"+ Submit New Request"</strong> above to ask an expert!
              </div>

              <div v-else class="list-group list-group-flush request-list">
                <button
                  v-for="r in requests"
                  :key="r._id"
                  type="button"
                  class="list-group-item list-group-item-action p-3"
                  :class="{ active: r._id === selectedRequestId && rightMode === 'request_details' }"
                  @click="selectRequest(r._id)"
                >
                  <div class="d-flex justify-content-between align-items-start mb-1">
                    <h6 class="mb-0 fw-bold text-capitalize">{{ r.cropName }}</h6>
                    <span
                      class="badge"
                      :class="{
                        'bg-warning text-dark': r.status === 'pending',
                        'bg-success': r.status === 'answered',
                      }"
                    >
                      {{ r.status === 'answered' ? 'Answered' : 'Pending' }}
                    </span>
                  </div>
                  <div class="small text-muted">
                    Submitted: {{ new Date(r.createdAt).toLocaleDateString() }}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: MAIN CONTENT (FORM OR REQUEST DETAILS) -->
        <div class="col-lg-8">

          <!-- MODE A: SUBMIT NEW REQUEST FORM ON THE RIGHT SIDE -->
          <div v-if="rightMode === 'new_request'" class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-white py-3 border-bottom">
              <h4 class="mb-0 fw-bold text-success">Submit New Farming Expertise Request</h4>
            </div>
            <div class="card-body p-4">
              <form @submit.prevent="handleSubmitRequest">
                <div class="mb-3">
                  <label for="cropName" class="form-label fw-bold">Crop Name <span class="text-danger">*</span></label>
                  <input
                    id="cropName"
                    v-model="cropName"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Guava, Mango, Rice, Wheat..."
                    required
                  />
                </div>

                <div class="mb-4">
                  <label for="comment" class="form-label fw-bold">Comment / Details</label>
                  <textarea
                    id="comment"
                    v-model="comment"
                    rows="5"
                    class="form-control"
                    placeholder="Provide additional details or questions regarding soil, pest control, growth, harvesting, etc."
                  ></textarea>
                </div>

                <div class="d-flex justify-content-end">
                  <button type="submit" class="btn-pill" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Submit Expertise Request
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- MODE B: LOADING REQUEST DETAILS -->
          <div v-else-if="rightMode === 'request_details' && loadingDetails" class="card shadow-sm border-0 p-5 text-center">
            <div class="spinner-border text-success mx-auto" role="status">
              <span class="visually-hidden">Loading request...</span>
            </div>
            <p class="mt-2 text-muted">Loading request details...</p>
          </div>

          <!-- MODE C: REQUEST DETAILS & EXPERT RESPONSE ON THE RIGHT SIDE -->
          <div v-else-if="rightMode === 'request_details' && selectedRequest" class="card shadow-sm border-0 mb-4">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h2 class="h3 fw-bold mb-1 text-capitalize">{{ selectedRequest.cropName }}</h2>
                  <p class="text-muted mb-0">
                    Submitted on: {{ new Date(selectedRequest.createdAt).toLocaleString() }}
                  </p>
                </div>
                <span
                  class="badge fs-6 px-3 py-2"
                  :class="{
                    'bg-warning text-dark': selectedRequest.status === 'pending',
                    'bg-success': selectedRequest.status === 'answered',
                  }"
                >
                  {{ selectedRequest.status === 'answered' ? 'Expertise Provided' : 'Pending Expert Review' }}
                </span>
              </div>

              <!-- Farmer Comment -->
              <div class="mb-4">
                <h5 class="fw-bold mb-2">Your Comment / Question</h5>
                <div class="p-3 bg-light rounded border">
                  {{ selectedRequest.comment || 'No additional comments provided.' }}
                </div>
              </div>

              <!-- EXPERT RESPONSE SECTION -->
              <div class="border-top pt-4 mt-4">
                <h4 class="fw-bold mb-3 text-success">Expert Response</h4>

                <div v-if="selectedRequest.response && selectedRequest.response.description" class="p-4 bg-success-subtle border border-success rounded">
                  <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-success-subtle pb-2">
                    <h5 class="fw-bold text-success mb-0">
                      Expert Advice by {{ selectedRequest.response.expertName || 'Agricultural Expert' }}
                    </h5>
                    <span class="small text-muted" v-if="selectedRequest.response.answeredAt">
                      {{ new Date(selectedRequest.response.answeredAt).toLocaleDateString() }}
                    </span>
                  </div>

                  <!-- Description -->
                  <div class="mb-4">
                    <h6 class="fw-bold mb-1 text-dark">Expert Guidance:</h6>
                    <p class="mb-0 text-dark" style="white-space: pre-line;">{{ selectedRequest.response.description }}</p>
                  </div>

                  <!-- Attachment -->
                  <div v-if="selectedRequest.response.attachment" class="mt-3 pt-3 border-top border-success-subtle">
                    <h6 class="fw-bold mb-2 text-dark">
                      Attached Document / Image:
                      <span class="text-success text-capitalize ms-1">
                        ({{ getCleanFileName(selectedRequest.response.attachment) }})
                      </span>
                    </h6>

                    <!-- If PDF -->
                    <div v-if="isPdf(selectedRequest.response.attachment)" class="d-flex align-items-center p-3 bg-white rounded border">
                      <div>
                        <h6 class="mb-1 fw-bold">Expert PDF Guide</h6>
                        <a
                          :href="`${apiBase}${selectedRequest.response.attachment}`"
                          target="_blank"
                          class="btn btn-sm btn-outline-success"
                        >
                          Download / View PDF
                        </a>
                      </div>
                    </div>

                    <!-- If Image (Stock or Uploaded) -->
                    <div v-else class="text-center bg-white p-3 rounded border">
                      <a
                        :href="`${apiBase}${selectedRequest.response.attachment}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="d-inline-block position-relative mb-2 cursor-pointer"
                        title="Click to view full image in new tab"
                      >
                        <img
                          :src="`${apiBase}${selectedRequest.response.attachment}`"
                          alt="Expert Crop Image"
                          class="img-fluid rounded shadow-sm max-img-height clickable-preview"
                        />
                      </a>
                      <div>
                        <a
                          :href="`${apiBase}${selectedRequest.response.attachment}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="btn btn-sm btn-outline-success mt-2"
                        >
                          View Full Size Image
                        </a>
                      </div>
                    </div>
                  </div>

                  <!-- BARC / Expert Attribution Line -->
                  <div class="mt-3 pt-2 border-top border-success-subtle text-muted small font-monospace text-end">
                    <span v-if="isStockCrop(selectedRequest.response)">
                      Expertise provided by BARC (Bangladesh Agricultural Research Council)
                    </span>
                    <span v-else>
                      Expertise provided by expert
                    </span>
                  </div>
                </div>

                <div v-else class="p-4 bg-light rounded text-center text-muted border">
                  An agricultural expert has not responded to this request yet. Please check back soon!
                </div>
              </div>
            </div>
          </div>

          <!-- MODE D: EMPTY FALLBACK -->
          <div v-else class="card shadow-sm border-0 p-5 text-center text-muted">
            Select a request from the left panel or click <strong>"+ Submit New Request"</strong> to create a new one.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
