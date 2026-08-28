<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import { authState } from '../stores/auth'

import { confirmDelete } from '../stores/confirm';
const diseases = ref([])
const symptomTags = ref([])

const loading = ref(false)
const loadingSymptoms = ref(false)
const submitting = ref(false)

const error = ref('')
const successMessage = ref('')

const form = ref({
  name: '',
  description: ''
})

const symptomSearch = ref('')
const selectedSymptoms = ref([])

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`
  }
}

/*
 * Load diseases from the disease library
 */
async function loadDiseases() {
  loading.value = true
  error.value = ''

  try {
    const response = await api.get(
      '/diseases/library',
      {
        headers: authHeader()
      }
    )

    diseases.value = response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Unable to load disease library.'
  } finally {
    loading.value = false
  }
}

/*
 * Load symptom tags that experts can attach
 * to diseases.
 */
async function loadSymptoms() {
  loadingSymptoms.value = true

  try {
    const response = await api.get(
      '/diseases/tags?type=symptom',
      {
        headers: authHeader()
      }
    )

    symptomTags.value = response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Unable to load symptom tags.'
  } finally {
    loadingSymptoms.value = false
  }
}

/*
 * Filter symptoms based on search input.
 */
const filteredSymptoms = () => {
  const search = symptomSearch.value
    .trim()
    .toLowerCase()

  if (!search) {
    return symptomTags.value
  }

  return symptomTags.value.filter(
    symptom =>
      symptom.name
        .toLowerCase()
        .includes(search)
  )
}

/*
 * Check whether a symptom is selected.
 */
function isSymptomSelected(id) {
  return selectedSymptoms.value.includes(id)
}

/*
 * Add/remove a symptom.
 */
function toggleSymptom(id) {
  if (isSymptomSelected(id)) {
    selectedSymptoms.value =
      selectedSymptoms.value.filter(
        symptomId => symptomId !== id
      )
  } else {
    selectedSymptoms.value.push(id)
  }
}

/*
 * Remove a selected symptom.
 */
function removeSymptom(id) {
  selectedSymptoms.value =
    selectedSymptoms.value.filter(
      symptomId => symptomId !== id
    )
}

/*
 * Get symptom object from its ID.
 */
function getSymptomName(id) {
  const symptom = symptomTags.value.find(
    item => item._id === id
  )

  return symptom
    ? symptom.name
    : 'Unknown symptom'
}

/*
 * Create a new disease.
 */
async function createDisease() {
  error.value = ''
  successMessage.value = ''

  if (!form.value.name.trim()) {
    error.value = 'Disease name is required.'
    return
  }

  if (!form.value.description.trim()) {
    error.value = 'Disease description is required.'
    return
  }

  submitting.value = true

  try {
    const response = await api.post(
      '/diseases/library',
      {
        name: form.value.name.trim(),

        description:
          form.value.description.trim(),

        symptoms: selectedSymptoms.value
      },
      {
        headers: authHeader()
      }
    )

    diseases.value.unshift(response.data)

    successMessage.value =
      'Disease added successfully.'

    resetForm()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to create disease.'
  } finally {
    submitting.value = false
  }
}

/*
 * Delete a disease from the library.
 */
async function deleteDisease(id) {
  const confirmed = await confirmDelete('Are you sure you want to delete this disease?')
  if (!confirmed) {
    return
  }

  error.value = ''
  successMessage.value = ''

  try {
    await api.delete(
      `/diseases/library/${id}`,
      {
        headers: authHeader()
      }
    )

    diseases.value =
      diseases.value.filter(
        disease => disease._id !== id
      )

    successMessage.value =
      'Disease deleted successfully.'
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to delete disease.'
  }
}

/*
 * Clear the disease form.
 */
function resetForm() {
  form.value = {
    name: '',
    description: ''
  }

  symptomSearch.value = ''
  selectedSymptoms.value = []
}

onMounted(async () => {
  await Promise.all([
    loadDiseases(),
    loadSymptoms()
  ])
})
</script>

<template>
  <div class="container py-4">

    <h1 class="mb-4">
      Disease Library
    </h1>

    <!-- Messages -->

    <div
      v-if="successMessage"
      class="app-alert app-alert-success"
    >
      {{ successMessage }}
    </div>

    <div
      v-if="error"
      class="app-alert app-alert-danger"
    >
      {{ error }}
    </div>

    <div class="row g-4">

      <!-- Add Disease -->

      <div class="col-lg-5">

        <div class="card shadow-sm">

          <div class="card-header">
            <h5 class="mb-0">
              Add Disease
            </h5>
          </div>

          <div class="card-body">

            <form
              @submit.prevent="createDisease"
            >

              <!-- Disease name -->

              <div class="mb-3">

                <label
                  for="diseaseName"
                  class="form-label"
                >
                  Disease Name
                </label>

                <input
                  id="diseaseName"
                  v-model="form.name"
                  type="text"
                  class="form-control"
                  placeholder="e.g. Tomato Early Blight"
                  maxlength="150"
                  :disabled="submitting"
                >

              </div>

              <!-- Description -->

              <div class="mb-3">

                <label
                  for="diseaseDescription"
                  class="form-label"
                >
                  Description
                </label>

                <textarea
                  id="diseaseDescription"
                  v-model="form.description"
                  rows="4"
                  class="form-control"
                  placeholder="Describe the disease..."
                  :disabled="submitting"
                ></textarea>

              </div>

              <!-- Symptoms -->

              <div class="mb-3">

                <label
                  for="symptomSearch"
                  class="form-label"
                >
                  Symptoms
                </label>

                <input
                  id="symptomSearch"
                  v-model="symptomSearch"
                  type="text"
                  class="form-control mb-2"
                  placeholder="Search symptoms..."
                  :disabled="submitting || loadingSymptoms"
                >

                <!-- Selected symptoms -->

                <div
                  v-if="selectedSymptoms.length"
                  class="d-flex flex-wrap gap-2 mb-3"
                >

                  <span
                    v-for="id in selectedSymptoms"
                    :key="id"
                    class="badge bg-success d-flex align-items-center gap-2"
                  >

                    {{ getSymptomName(id) }}

                    <button
                      type="button"
                      class="btn-close btn-close-white"
                      aria-label="Remove symptom"
                      @click="removeSymptom(id)"
                    ></button>

                  </span>

                </div>

                <!-- Loading -->

                <div
                  v-if="loadingSymptoms"
                  class="text-muted small"
                >
                  Loading symptoms...
                </div>

                <!-- Available symptoms -->

                <div
                  v-else
                  class="list-group"
                >

                  <button
                    v-for="symptom in filteredSymptoms()"
                    :key="symptom._id"
                    type="button"
                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    :class="{
                      'active': isSymptomSelected(symptom._id)
                    }"
                    @click="toggleSymptom(symptom._id)"
                  >

                    <span>
                      {{ symptom.name }}
                    </span>

                    <span
                      v-if="isSymptomSelected(symptom._id)"
                    >
                      ✓
                    </span>

                  </button>

                  <div
                    v-if="filteredSymptoms().length === 0"
                    class="text-muted small py-2"
                  >
                    No symptoms found.
                  </div>

                </div>

              </div>

              <!-- Submit -->

              <button
                type="submit"
                class="btn-pill"
                :disabled="submitting"
              >

                {{
                  submitting
                    ? 'Creating...'
                    : 'Create Disease'
                }}

              </button>

            </form>

          </div>

        </div>

      </div>

      <!-- Disease List -->

      <div class="col-lg-7">

        <div class="card shadow-sm">

          <div class="card-header">

            <h5 class="mb-0">
              Known Diseases
            </h5>

          </div>

          <!-- Loading -->

          <div
            v-if="loading"
            class="card-body text-center"
          >
            Loading diseases...
          </div>

          <!-- Empty -->

          <div
            v-else-if="diseases.length === 0"
            class="card-body text-muted"
          >
            No diseases have been added yet.
          </div>

          <!-- Diseases -->

          <div
            v-else
            class="list-group list-group-flush"
          >

            <div
              v-for="disease in diseases"
              :key="disease._id"
              class="list-group-item"
            >

              <div
                class="d-flex justify-content-between align-items-start gap-3"
              >

                <div>

                  <h5 class="mb-1">
                    {{ disease.name }}
                  </h5>

                  <p class="mb-2 text-muted">
                    {{ disease.description }}
                  </p>

                </div>

                <button
                  type="button"
                  class="btn-pill-danger btn-pill-sm"
                  @click="deleteDisease(disease._id)"
                >
                  Delete
                </button>

              </div>

              <!-- Disease symptoms -->

              <div
                v-if="
                  disease.symptoms &&
                  disease.symptoms.length
                "
                class="d-flex flex-wrap gap-2 mt-2"
              >

                <span
                  v-for="symptom in disease.symptoms"
                  :key="symptom._id"
                  class="badge bg-success"
                >
                  {{ symptom.name }}
                </span>

              </div>

              <div
                v-else
                class="small text-muted mt-2"
              >
                No symptoms assigned.
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>
