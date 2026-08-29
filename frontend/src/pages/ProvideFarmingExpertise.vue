<script setup>
import { ref, onMounted, computed } from 'vue';
import api, { serverUrl as apiBase } from '../services/api';
import { authState } from '../stores/auth';

const requests = ref([]);
const selectedRequestId = ref(null);
const selectedRequest = ref(null);
const stockImages = ref([]);

const loadingRequests = ref(true);
const loadingDetails = ref(false);
const loadingStock = ref(false);
const submitting = ref(false);

const filterStatus = ref('all'); // 'all', 'pending', 'answered'
const attachmentMode = ref('stock'); // 'stock' or 'file'

const description = ref('');
const selectedStockImage = ref('');
const uploadedFile = ref(null);

const errorMessage = ref('');
const successMessage = ref('');

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`,
  };
}

const filteredRequests = computed(() => {
  if (filterStatus.value === 'pending') {
    return requests.value.filter((r) => r.status === 'pending');
  }
  if (filterStatus.value === 'answered') {
    return requests.value.filter((r) => r.status === 'answered');
  }
  return requests.value;
});

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
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load expertise requests.';
  } finally {
    loadingRequests.value = false;
  }
}

async function loadStockImages() {
  loadingStock.value = true;
  try {
    const response = await api.get('/farming-expertise/stock-images', {
      headers: authHeader(),
    });
    stockImages.value = response.data;
  } catch (err) {
    console.error(err);
  } finally {
    loadingStock.value = false;
  }
}

async function selectRequest(id) {
  selectedRequestId.value = id;
  loadingDetails.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  // Reset form
  description.value = '';
  selectedStockImage.value = '';
  uploadedFile.value = null;

  try {
    const response = await api.get(`/farming-expertise/${id}`, {
      headers: authHeader(),
    });
    selectedRequest.value = response.data;

    // Pre-fill form if response exists
    if (selectedRequest.value.response) {
      description.value = selectedRequest.value.response.description || '';
      if (selectedRequest.value.response.attachmentType === 'stock_image') {
        attachmentMode.value = 'stock';
        selectedStockImage.value = selectedRequest.value.response.attachment || '';
      }
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load request details.';
  } finally {
    loadingDetails.value = false;
  }
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    uploadedFile.value = file;
  }
}

function selectStockImage(url) {
  selectedStockImage.value = url;
}

async function handleSubmitResponse() {
  if (!description.value.trim()) {
    errorMessage.value = 'Please provide an expert description / advice.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const formData = new FormData();
    formData.append('description', description.value.trim());

    if (attachmentMode.value === 'file' && uploadedFile.value) {
      formData.append('attachment', uploadedFile.value);
    } else if (attachmentMode.value === 'stock' && selectedStockImage.value) {
      formData.append('selectedStockImage', selectedStockImage.value);
    }

    const response = await api.post(
      `/farming-expertise/${selectedRequestId.value}/respond`,
      formData,
      {
        headers: {
          ...authHeader(),
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    successMessage.value = 'Expertise response submitted successfully! Farmer has been notified.';
    selectedRequest.value = response.data.request;

    // Update in local requests list
    const index = requests.value.findIndex((r) => r._id === selectedRequestId.value);
    if (index !== -1) {
      requests.value[index].status = 'answered';
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = err.response?.data?.message || 'Failed to submit expertise response.';
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

function getCleanPresetName(url) {
  if (!url) return '';
  const filename = url.split('/').pop() || url;
  const clean = filename.replace(/^[0-9]+-[0-9]+-/, '');
  const name = clean.replace(/\.[^/.]+$/, '');
  return (name || 'Attached File').replace(/_/g, ' ');
}

onMounted(() => {
  loadRequests();
  loadStockImages();
});
</script>

<template>
  <div class="provide-expertise-page">
    <div class="container py-4">
      <div class="mb-4">
        <h1 class="page-title">Provide Farming Expertise</h1>
        <p class="text-muted mb-0">
          Review farmer crop expertise requests and provide guidance with custom PDF/PNG uploads or stock crop images.
        </p>
      </div>

      <div v-if="errorMessage" class="app-alert app-alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="app-alert app-alert-success mb-4">
        {{ successMessage }}
      </div>

      <div class="row">
        <!-- LEFT COLUMN: REQUESTS LIST -->
        <div class="col-lg-4 mb-4">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-white py-3 border-bottom">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold">Farmer Requests</h5>
                <span class="badge bg-secondary">{{ filteredRequests.length }}</span>
              </div>

              <!-- Filter Tabs -->
              <div class="btn-group btn-group-sm w-100 mt-3" role="group">
                <button
                  type="button"
                  class="btn"
                  :class="filterStatus === 'all' ? 'btn-success' : 'btn-outline-secondary'"
                  @click="filterStatus = 'all'"
                >
                  All
                </button>
                <button
                  type="button"
                  class="btn"
                  :class="filterStatus === 'pending' ? 'btn-success' : 'btn-outline-secondary'"
                  @click="filterStatus = 'pending'"
                >
                  Pending
                </button>
                <button
                  type="button"
                  class="btn"
                  :class="filterStatus === 'answered' ? 'btn-success' : 'btn-outline-secondary'"
                  @click="filterStatus = 'answered'"
                >
                  Answered
                </button>
              </div>
            </div>

            <div v-if="loadingRequests" class="card-body text-center py-4">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>

            <div v-else-if="filteredRequests.length === 0" class="card-body text-center py-4 text-muted">
              No expertise requests found.
            </div>

            <div v-else class="list-group list-group-flush request-list">
              <button
                v-for="r in filteredRequests"
                :key="r._id"
                type="button"
                class="list-group-item list-group-item-action p-3"
                :class="{ active: r._id === selectedRequestId }"
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
                <div class="small text-muted mb-1">
                  Farmer: {{ r.farmer?.name || 'Unknown' }}
                </div>
                <div class="small text-muted">
                  Submitted: {{ new Date(r.createdAt).toLocaleDateString() }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: DETAILS & RESPONSE FORM -->
        <div class="col-lg-8">
          <div v-if="loadingDetails" class="card shadow-sm border-0 p-5 text-center">
            <div class="spinner-border text-success mx-auto" role="status">
              <span class="visually-hidden">Loading details...</span>
            </div>
            <p class="mt-2 text-muted">Loading request details...</p>
          </div>

          <div v-else-if="selectedRequest" class="card shadow-sm border-0 mb-4">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h2 class="h3 fw-bold mb-1 text-capitalize">{{ selectedRequest.cropName }} Request</h2>
                  <p class="text-muted mb-0">
                    Farmer: <strong>{{ selectedRequest.farmer?.name || 'Farmer' }}</strong> 
                    ({{ selectedRequest.farmer?.email }})
                    <span v-if="selectedRequest.farmer?.district"> | Location: {{ selectedRequest.farmer?.district }}, {{ selectedRequest.farmer?.upazila }}</span>
                  </p>
                </div>
                <span
                  class="badge fs-6 px-3 py-2"
                  :class="{
                    'bg-warning text-dark': selectedRequest.status === 'pending',
                    'bg-success': selectedRequest.status === 'answered',
                  }"
                >
                  {{ selectedRequest.status === 'answered' ? 'Answered' : 'Pending Review' }}
                </span>
              </div>

              <!-- Farmer Comment -->
              <div class="mb-4">
                <h5 class="fw-bold mb-2">Farmer's Comment / Question</h5>
                <div class="p-3 bg-light rounded border">
                  {{ selectedRequest.comment || 'No additional comments provided.' }}
                </div>
              </div>

              <!-- Existing Response View if Answered -->
              <div v-if="selectedRequest.response?.description" class="mb-4 p-4 bg-success-subtle border border-success rounded">
                <h5 class="fw-bold text-success mb-2">Previously Submitted Response</h5>
                <p class="mb-2" style="white-space: pre-line;">{{ selectedRequest.response.description }}</p>
                <div v-if="selectedRequest.response.attachment" class="mt-2 text-muted small">
                  Attached File / Image:
                  <a
                    :href="`${apiBase}${selectedRequest.response.attachment}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-success text-decoration-underline ms-1 fw-bold"
                    title="Click to view file in new tab"
                  >
                    {{ getCleanPresetName(selectedRequest.response.attachment) }} (Click to View)
                  </a>
                </div>
                <div class="mt-3 pt-2 border-top border-success-subtle text-muted small font-monospace text-end">
                  <span v-if="isStockCrop(selectedRequest.response)">
                    Expertise provided by BARC (Bangladesh Agricultural Research Council)
                  </span>
                  <span v-else>
                    Expertise provided by expert
                  </span>
                </div>
              </div>

              <!-- RESPONSE FORM -->
              <div class="border-top pt-4 mt-4">
                <h4 class="fw-bold text-success mb-3">Provide Expertise Response</h4>

                <form @submit.prevent="handleSubmitResponse">
                  <div class="mb-4">
                    <label for="description" class="form-label fw-bold">Expert Advice & Description <span class="text-danger">*</span></label>
                    <textarea
                      id="description"
                      v-model="description"
                      rows="5"
                      class="form-control"
                      placeholder="Write comprehensive farming expertise, soil management, fertilizer application, crop rotation, or harvesting advice..."
                      required
                    ></textarea>
                  </div>

                  <!-- Attachment Selection Tabs -->
                  <div class="mb-4">
                    <label class="form-label fw-bold">Optional Attachment (Image or PDF)</label>
                    <div class="btn-group w-100 mb-3" role="group">
                      <button
                        type="button"
                        class="btn py-2"
                        :class="attachmentMode === 'stock' ? 'btn-success' : 'btn-outline-secondary'"
                        @click="attachmentMode = 'stock'"
                      >
                        Select Stock Crop Image (34 Presets)
                      </button>
                      <button
                        type="button"
                        class="btn py-2"
                        :class="attachmentMode === 'file' ? 'btn-success' : 'btn-outline-secondary'"
                        @click="attachmentMode = 'file'"
                      >
                        Upload PNG / JPG / PDF File
                      </button>
                    </div>

                    <!-- MODE 1: Stock Crop Preset Selector -->
                    <div v-if="attachmentMode === 'stock'" class="p-3 bg-light rounded border">
                      <h6 class="fw-bold mb-2">Select a Stock Crop Preset:</h6>
                      
                      <div v-if="stockImages.length === 0" class="text-muted small py-2">
                        No stock images found in database!
                      </div>

                      <div v-else class="d-flex flex-wrap gap-2 max-stock-grid">
                        <button
                          v-for="img in stockImages"
                          :key="img.url"
                          type="button"
                          class="btn btn-sm"
                          :class="selectedStockImage === img.url ? 'btn-success' : 'btn-outline-secondary'"
                          @click="selectStockImage(img.url)"
                        >
                          {{ img.name }}
                        </button>
                      </div>

                      <div v-if="selectedStockImage" class="mt-3 text-success fw-bold small">
                        Selected Preset:
                        <a
                          :href="`${apiBase}${selectedStockImage}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-success text-decoration-underline ms-1"
                          title="Click to view image in new tab"
                        >
                          {{ getCleanPresetName(selectedStockImage) }} (Click to View Image)
                        </a>
                      </div>
                    </div>

                    <!-- MODE 2: Custom File Upload -->
                    <div v-else class="p-3 bg-light rounded border">
                      <label for="fileUpload" class="form-label fw-bold small">Upload File (PNG, JPG, or PDF)</label>
                      <input
                        id="fileUpload"
                        type="file"
                        accept="image/png, image/jpeg, image/webp, application/pdf"
                        class="form-control"
                        @change="handleFileChange"
                      />
                      <div v-if="uploadedFile" class="mt-2 text-success small">
                        Selected File: {{ uploadedFile.name }} ({{ (uploadedFile.size / 1024).toFixed(1) }} KB)
                      </div>
                    </div>
                  </div>

                  <div class="d-flex justify-content-end">
                    <button type="submit" class="btn-pill" :disabled="submitting">
                      <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submit Expertise Response
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>

          <div v-else class="card shadow-sm border-0 p-5 text-center text-muted">
            Select a farmer request from the left panel to review and provide expertise.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-list .list-group-item.active,
.request-list .list-group-item.active h6 {
  color: #ffffff;
}

[data-theme='dark'] .request-list .list-group-item.active,
[data-theme='dark'] .request-list .list-group-item.active h6 {
  color: var(--green-900);
}
[data-theme='dark'] .request-list .list-group-item.active .text-muted {
  color: var(--green-800) !important;
}
[data-theme='dark'] .request-list .list-group-item:hover,
[data-theme='dark'] .request-list .list-group-item:hover h6,
[data-theme='dark'] .request-list .list-group-item:hover .text-muted {
  color: #ffffff !important;
}
</style>

