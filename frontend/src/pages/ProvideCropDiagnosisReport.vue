<script setup>
import { ref, onMounted, computed } from 'vue';
import api, { serverUrl as apiBase } from '../services/api';
import { authState } from '../stores/auth';

const cases = ref([]);
const selectedCaseId = ref(null);
const selectedCase = ref(null);
const matches = ref([]);

const loadingCases = ref(true);
const loadingDetails = ref(false);
const submitting = ref(false);

const filterStatus = ref('all'); // 'all', 'pending', 'resolved'
const errorMessage = ref('');
const successMessage = ref('');

// Form state
const diseaseName = ref('');
const recommendation = ref('');
const additionalNotes = ref('');

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`,
  };
}

const filteredCases = computed(() => {
  if (filterStatus.value === 'pending') {
    return cases.value.filter((c) => c.status === 'pending' || c.status === 'under_review');
  }
  if (filterStatus.value === 'resolved') {
    return cases.value.filter((c) => c.status === 'resolved' || c.status === 'diagnosed');
  }
  return cases.value;
});

async function loadCases() {
  loadingCases.value = true;
  errorMessage.value = '';

  try {
    const response = await api.get('/diseases', {
      headers: authHeader(),
    });
    cases.value = response.data;

    if (cases.value.length > 0) {
      await selectCase(cases.value[0]._id);
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load disease cases.';
  } finally {
    loadingCases.value = false;
  }
}

async function selectCase(caseId) {
  selectedCaseId.value = caseId;
  loadingDetails.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  // Reset form
  diseaseName.value = '';
  recommendation.value = '';
  additionalNotes.value = '';

  try {
    const [caseRes, matchesRes] = await Promise.all([
      api.get(`/diseases/${caseId}`, { headers: authHeader() }),
      api.get(`/diseases/${caseId}/matches`, { headers: authHeader() }),
    ]);

    selectedCase.value = caseRes.data;
    matches.value = matchesRes.data;

    // Pre-fill form if already has report
    if (selectedCase.value.diagnosisReport) {
      diseaseName.value = selectedCase.value.diagnosisReport.diseaseName || '';
      recommendation.value = selectedCase.value.diagnosisReport.recommendation || '';
      additionalNotes.value = selectedCase.value.diagnosisReport.additionalNotes || '';
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = 'Failed to load case details.';
  } finally {
    loadingDetails.value = false;
  }
}

function selectSuggestedDisease(name) {
  diseaseName.value = name;
}

async function handleSubmitReport() {
  if (!diseaseName.value.trim() || !recommendation.value.trim()) {
    errorMessage.value = 'Please provide both Disease Name and Recommendation.';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await api.post(
      `/diseases/${selectedCaseId.value}/diagnosis`,
      {
        diseaseName: diseaseName.value.trim(),
        recommendation: recommendation.value.trim(),
        additionalNotes: additionalNotes.value.trim(),
      },
      { headers: authHeader() }
    );

    successMessage.value = 'Crop Diagnosis Report submitted successfully! Farmer has been notified.';
    selectedCase.value = response.data.diseaseCase;

    // Update in local cases list
    const index = cases.value.findIndex((c) => c._id === selectedCaseId.value);
    if (index !== -1) {
      cases.value[index].status = 'resolved';
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = err.response?.data?.message || 'Failed to submit diagnosis report.';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadCases);
</script>

<template>
  <div class="diagnosis-report-page">
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="page-title">Provide Crop Diagnosis Report</h1>
          <p class="text-muted mb-0">
            Review farmer-submitted disease cases and provide expert diagnosis & guidance.
          </p>
        </div>
      </div>

      <div v-if="errorMessage" class="app-alert app-alert-danger mb-4">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="app-alert app-alert-success mb-4">
        {{ successMessage }}
      </div>

      <div class="row">
        <!-- LEFT COLUMN: CASES LIST -->
        <div class="col-lg-4 mb-4">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-white py-3 border-bottom">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0 fw-bold">Submitted Cases</h5>
                <span class="badge bg-secondary">{{ filteredCases.length }}</span>
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
                  :class="filterStatus === 'resolved' ? 'btn-success' : 'btn-outline-secondary'"
                  @click="filterStatus = 'resolved'"
                >
                  Resolved
                </button>
              </div>
            </div>

            <div v-if="loadingCases" class="card-body text-center py-4">
              <div class="spinner-border text-success" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>

            <div v-else-if="filteredCases.length === 0" class="card-body text-center py-4 text-muted">
              No disease cases found.
            </div>

            <div v-else class="list-group list-group-flush case-list">
              <button
                v-for="c in filteredCases"
                :key="c._id"
                type="button"
                class="list-group-item list-group-item-action p-3"
                :class="{ active: c._id === selectedCaseId }"
                @click="selectCase(c._id)"
              >
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <h6 class="mb-0 fw-bold text-capitalize">{{ c.crop?.type }}</h6>
                  <span
                    class="badge"
                    :class="{
                      'bg-warning text-dark': c.status === 'pending' || c.status === 'under_review',
                      'bg-success': c.status === 'resolved' || c.status === 'diagnosed',
                    }"
                  >
                    {{ c.status === 'resolved' ? 'Resolved' : 'Pending' }}
                  </span>
                </div>

                <div class="small text-muted mb-1">
                  Variety: {{ c.crop?.variety || 'N/A' }}
                </div>

                <div class="small text-muted">
                  Submitted: {{ new Date(c.createdAt).toLocaleDateString() }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: CASE DETAILS & DIAGNOSIS FORM -->
        <div class="col-lg-8">
          <div v-if="loadingDetails" class="card shadow-sm border-0 p-5 text-center">
            <div class="spinner-border text-success mx-auto" role="status">
              <span class="visually-hidden">Loading case...</span>
            </div>
            <p class="mt-2 text-muted">Loading case details...</p>
          </div>

          <div v-else-if="selectedCase" class="card shadow-sm border-0 mb-4">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                <div>
                  <h2 class="h3 fw-bold mb-1 text-capitalize">{{ selectedCase.crop?.type }} Case</h2>
                  <p class="text-muted mb-0">
                    Submitted by: <strong>{{ selectedCase.farmer?.name || 'Farmer' }}</strong> 
                    ({{ selectedCase.farmer?.email }})
                  </p>
                </div>
                <span
                  class="badge fs-6 px-3 py-2"
                  :class="{
                    'bg-warning text-dark': selectedCase.status === 'pending',
                    'bg-success': selectedCase.status === 'resolved',
                  }"
                >
                  {{ selectedCase.status === 'resolved' ? 'Resolved' : 'Pending Review' }}
                </span>
              </div>

              <!-- Crop Info Grid -->
              <div class="row g-3 mb-4">
                <div class="col-sm-4">
                  <div class="p-3 bg-light rounded">
                    <span class="text-muted d-block small">Variety</span>
                    <strong>{{ selectedCase.crop?.variety || 'Not specified' }}</strong>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="p-3 bg-light rounded">
                    <span class="text-muted d-block small">Growth Stage</span>
                    <strong>{{ selectedCase.crop?.growthStage || 'Not specified' }}</strong>
                  </div>
                </div>
                <div class="col-sm-4">
                  <div class="p-3 bg-light rounded">
                    <span class="text-muted d-block small">Age</span>
                    <strong>{{ selectedCase.crop?.age || 'Not specified' }}</strong>
                  </div>
                </div>
              </div>

              <!-- Reported Symptoms & Conditions -->
              <div class="mb-4">
                <h5 class="fw-bold mb-2">Reported Symptoms</h5>
                <div v-if="selectedCase.symptoms?.length > 0" class="d-flex flex-wrap gap-2 mb-3">
                  <span v-for="s in selectedCase.symptoms" :key="s._id" class="badge bg-success-subtle text-success border border-success px-3 py-2">
                    {{ s.name }}
                  </span>
                </div>
                <p v-else class="text-muted small">No specific symptom tags attached.</p>

                <h5 class="fw-bold mb-2">Farming Conditions</h5>
                <div v-if="selectedCase.farmingConditions?.length > 0" class="d-flex flex-wrap gap-2">
                  <span v-for="c in selectedCase.farmingConditions" :key="c._id" class="badge bg-info-subtle text-info border border-info px-3 py-2">
                    {{ c.name }}
                  </span>
                </div>
                <p v-else class="text-muted small">No farming conditions specified.</p>
              </div>

              <!-- Description -->
              <div v-if="selectedCase.description" class="mb-4">
                <h5 class="fw-bold mb-2">Farmer's Description</h5>
                <div class="p-3 bg-light rounded border">
                  {{ selectedCase.description }}
                </div>
              </div>

              <!-- Uploaded Images -->
              <div class="mb-4">
                <h5 class="fw-bold mb-2">Uploaded Images</h5>
                <div v-if="selectedCase.images?.length > 0" class="d-flex flex-wrap gap-3">
                  <img
                    v-for="(img, idx) in selectedCase.images"
                    :key="idx"
                    :src="`${apiBase}${img}`"
                    alt="Disease symptom photo"
                    class="rounded border shadow-sm style-img"
                  />
                </div>
                <p v-else class="text-muted">No images uploaded by farmer.</p>
              </div>

              <!-- System Matching Suggestions -->
              <div v-if="matches.length > 0" class="mb-4 p-3 bg-success-subtle border border-success-subtle rounded">
                <h6 class="fw-bold text-success mb-2">System Symptom Matches</h6>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-for="m in matches"
                    :key="m._id"
                    type="button"
                    class="btn btn-sm btn-outline-success"
                    @click="selectSuggestedDisease(m.name)"
                  >
                    + Use "{{ m.name }}" ({{ m.matchPercentage }}% match)
                  </button>
                </div>
              </div>

              <!-- DIAGNOSIS REPORT SECTION -->
              <div class="border-top pt-4 mt-4">
                <div class="d-flex align-items-center mb-3">
                  <h4 class="fw-bold mb-0 text-success">Crop Diagnosis Report</h4>
                </div>

                <!-- Existing Report View -->
                <div v-if="selectedCase.diagnosisReport" class="p-4 bg-light rounded border border-success mb-4">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 class="fw-bold text-success mb-1">
                        Diagnosed Disease: {{ selectedCase.diagnosisReport.diseaseName }}
                      </h5>
                      <span class="small text-muted">
                        Diagnosed by: <strong>{{ selectedCase.diagnosisReport.expertName }}</strong> on {{ new Date(selectedCase.diagnosisReport.createdAt).toLocaleDateString() }}
                      </span>
                    </div>
                    <span class="badge bg-success">Status: Resolved</span>
                  </div>

                  <div class="mb-3">
                    <h6 class="fw-bold mb-1">Recommendation & Treatment Plan:</h6>
                    <p class="mb-0 text-dark" style="white-space: pre-line;">{{ selectedCase.diagnosisReport.recommendation }}</p>
                  </div>

                  <div v-if="selectedCase.diagnosisReport.additionalNotes">
                    <h6 class="fw-bold mb-1">Additional Notes / Prevention:</h6>
                    <p class="mb-0 text-muted" style="white-space: pre-line;">{{ selectedCase.diagnosisReport.additionalNotes }}</p>
                  </div>
                </div>

                <!-- Diagnosis Form for Expert -->
                <form @submit.prevent="handleSubmitReport" class="p-4 bg-white rounded border">
                  <h5 class="fw-bold mb-3">
                    {{ selectedCase.diagnosisReport ? 'Update Diagnosis Report' : 'Submit New Diagnosis Report' }}
                  </h5>

                  <div class="mb-3">
                    <label for="diseaseName" class="form-label fw-bold">Disease Name <span class="text-danger">*</span></label>
                    <input
                      id="diseaseName"
                      v-model="diseaseName"
                      type="text"
                      class="form-control"
                      placeholder="e.g. Rice Blast / Late Blight of Potato"
                      required
                    />
                  </div>

                  <div class="mb-3">
                    <label for="recommendation" class="form-label fw-bold">Recommendation & Treatment Plan <span class="text-danger">*</span></label>
                    <textarea
                      id="recommendation"
                      v-model="recommendation"
                      rows="4"
                      class="form-control"
                      placeholder="Provide specific agricultural advice, pesticide/fungicide instructions, fertilizer adjustments, or crop care steps..."
                      required
                    ></textarea>
                  </div>

                  <div class="mb-3">
                    <label for="additionalNotes" class="form-label fw-bold">Additional Notes / Preventive Advice</label>
                    <textarea
                      id="additionalNotes"
                      v-model="additionalNotes"
                      rows="2"
                      class="form-control"
                      placeholder="Optional long-term preventive measures or soil health tips..."
                    ></textarea>
                  </div>

                  <div class="d-flex justify-content-end">
                    <button type="submit" class="btn-pill" :disabled="submitting">
                      <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submit Diagnosis Report & Mark Resolved
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>

          <div v-else class="card shadow-sm border-0 p-5 text-center text-muted">
            Select a disease case from the left panel to review and provide a diagnosis report.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

