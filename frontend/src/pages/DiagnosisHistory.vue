<script setup>
import { ref, onMounted } from 'vue';
import api, { serverUrl as apiBase } from '../services/api';
import { authState } from '../stores/auth';

const selectedCaseId = ref(null);

const loadingCases = ref(true);
const loadingDetails = ref(false);

const cases = ref([]);
const selectedCase = ref(null);
const matches = ref([]);

const error = ref('');

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`,
  };
}

async function loadCases() {
  loadingCases.value = true;
  error.value = '';

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
    error.value = 'Unable to load disease cases.';
  } finally {
    loadingCases.value = false;
  }
}

async function selectCase(caseId) {
  loadingDetails.value = true;

  try {

    const caseResponse = await api.get(`/diseases/${caseId}`, {
      headers: authHeader(),
    });

    selectedCaseId.value = caseId;
    selectedCase.value = caseResponse.data;

    const matchesResponse = await api.get(
      `/diseases/${caseId}/matches`,
      {
        headers: authHeader(),
      }
    );

    matches.value = matchesResponse.data;

  } catch (err) {
    console.error(err);
    error.value = 'Unable to load case details.';
  } finally {
    loadingDetails.value = false;
  }
}

function matchColor(percent) {

  if (percent >= 80)
    return 'bg-success';

  if (percent >= 50)
    return 'bg-warning';

  if (percent >= 20)
    return 'bg-orange';

  return 'bg-secondary';
}

onMounted(loadCases);
</script>

<template>

<div class="diagnosis-page">

  <div class="container">

    <h1 class="mb-4">
      Diagnosis History
    </h1>

    <div
      class="app-alert app-alert-danger"
      v-if="error"
    >
      {{ error }}
    </div>

    <div class="row">

      <!-- LEFT COLUMN -->

      <div class="col-lg-4">

        <div class="card shadow-sm">

          <div class="card-header">
            Submitted Cases
          </div>

          <div
            class="card-body loading-state"
            v-if="loadingCases"
          >
            Loading...
          </div>

          <div
            v-else
            class="list-group list-group-flush"
          >

            <button
              v-for="diseaseCase in cases"
              :key="diseaseCase._id"
              :class="[
                'list-group-item',
                'list-group-item-action',
                {
                  active: diseaseCase._id === selectedCaseId
                }
              ]"
              @click="selectCase(diseaseCase._id)"
            >

              <strong>

                {{ diseaseCase.crop.type }}

              </strong>

              <br>

              <small>

                {{ diseaseCase.crop.variety }}

              </small>

              <br>

              <span
                class="badge bg-secondary mt-2"
              >
                {{ diseaseCase.status }}
              </span>

            </button>

          </div>

        </div>

      </div>

      <!-- RIGHT COLUMN -->

      <div class="col-lg-8">

        <div
          v-if="loadingDetails"
          class="card shadow-sm"
        >
          <div class="card-body loading-state">

            Loading case...

          </div>
        </div>

        <div
          v-else-if="selectedCase"
          class="card shadow-sm"
        >

          <div class="card-body">

            <h2>

              {{ selectedCase.crop.type }}

            </h2>

            <p>

              <strong>Variety:</strong>

              {{ selectedCase.crop.variety }}

            </p>

            <p>

              <strong>Growth Stage:</strong>

              {{ selectedCase.crop.growthStage }}

            </p>

            <p>

              <strong>Age:</strong>

              {{ selectedCase.crop.age }}

            </p>

            <p>

              <strong>Status:</strong>

              {{ selectedCase.status }}

            </p>

            <!-- OFFICIAL EXPERT DIAGNOSIS REPORT -->
            <div
              v-if="selectedCase.diagnosisReport"
              class="app-alert app-alert-success mt-3"
            >
              <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                <h4 class="alert-heading mb-0 text-success fw-bold">
                  📋 Official Expert Diagnosis Report
                </h4>
                <span class="badge bg-success">Resolved</span>
              </div>

              <p class="mb-2">
                <strong>Diagnosed Disease:</strong>
                <span class="fs-5 fw-bold text-success ms-1">
                  {{ selectedCase.diagnosisReport.diseaseName }}
                </span>
              </p>

              <div class="mb-2">
                <strong>Recommendation & Treatment:</strong>
                <p class="mb-0 mt-1 text-dark" style="white-space: pre-line;">
                  {{ selectedCase.diagnosisReport.recommendation }}
                </p>
              </div>

              <div v-if="selectedCase.diagnosisReport.additionalNotes" class="mb-2">
                <strong>Additional Notes:</strong>
                <p class="mb-0 mt-1 text-muted" style="white-space: pre-line;">
                  {{ selectedCase.diagnosisReport.additionalNotes }}
                </p>
              </div>

              <div class="text-end text-muted small mt-2">
                Diagnosed by: <strong>{{ selectedCase.diagnosisReport.expertName || 'Agricultural Expert' }}</strong>
                <span v-if="selectedCase.diagnosisReport.createdAt">
                  on {{ new Date(selectedCase.diagnosisReport.createdAt).toLocaleDateString() }}
                </span>
              </div>
            </div>
            <hr>

            <h4>

              Reported Symptoms

            </h4>

            <div class="chip-container">

              <span
                v-for="symptom in selectedCase.symptoms"
                :key="symptom._id"
                class="chip chip-green"
              >
                {{ symptom.name }}
              </span>

            </div>

            <h4 class="mt-4">

              Farming Conditions

            </h4>

            <div class="chip-container">

              <span
                v-for="condition in selectedCase.farmingConditions"
                :key="condition._id"
                class="chip chip-blue"
              >
                {{ condition.name }}
              </span>

            </div>

            <hr>

            <h3>

              Possible Disease Matches

            </h3>

            <p class="text-muted">

              These are possible matches based on your
              reported symptoms.

            </p>

            <div
              v-if="matches.length === 0"
              class="empty-state"
            >
              No matching diseases were found.

              <br><br>

              Your case has still been submitted and can be
              reviewed by an agricultural expert.
            </div>

            <div
              v-for="match in matches"
              :key="match._id"
              class="match-card"
            >

              <div
                class="d-flex justify-content-between align-items-center"
              >

                <div>

                  <h4 class="mb-1">
                    {{ match.name }}
                  </h4>

                  <p class="text-muted mb-0">
                    {{ match.description }}
                  </p>

                </div>

                <span
                  class="badge fs-6"
                  :class="{
                    'bg-success': match.matchPercentage >= 80,
                    'bg-warning text-dark':
                      match.matchPercentage >= 50 &&
                      match.matchPercentage < 80,
                    'bg-danger':
                      match.matchPercentage < 50
                  }"
                >
                  {{ match.matchPercentage }}%
                </span>

              </div>

              <div class="progress mt-3">

                <div
                  class="progress-bar"
                  :class="matchColor(match.matchPercentage)"
                  :style="{
                    width: match.matchPercentage + '%'
                  }"
                >
                  {{ match.matchPercentage }}%
                </div>

              </div>

              <p class="mt-3 mb-2">

                <strong>

                  Matched

                  {{ match.matchedSymptomsCount }}

                  of

                  {{ match.totalDiseaseSymptoms }}

                  known symptoms

                </strong>

              </p>

              <div class="mb-3">

                <span
                  v-for="symptom in match.matchedSymptoms"
                  :key="symptom._id"
                  class="chip chip-green"
                >
                  ✓ {{ symptom.name }}
                </span>

              </div>

              <h6>

                Other symptoms commonly associated
                with this disease

              </h6>

              <div>

                <span
                  v-for="symptom in match.unmatchedSymptoms"
                  :key="symptom._id"
                  class="chip chip-gray"
                >
                  {{ symptom.name }}
                </span>

              </div>

            </div>

            <hr>

            <h3>

            Uploaded Images

            </h3>

            <div
              v-if="selectedCase.images.length === 0"
              class="text-muted"
            >
              No images uploaded.
            </div>

            <div
              v-else
              class="image-grid"
            >

              <img
                v-for="image in selectedCase.images"
                :key="image"
                :src="`${apiBase}${image}`"
                class="disease-image"
              >

            </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

            </template>
