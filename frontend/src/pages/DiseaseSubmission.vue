<script setup>
import { ref } from 'vue';
import api from '../services/api';
import { authState } from '../stores/auth';

const cropType = ref('');
const cropVariety = ref('');
const growthStage = ref('');
const cropAge = ref('');
const description = ref('');

const symptomSearch = ref('');
const farmingSearch = ref('');

const symptomTags = ref([]);
const farmingTags = ref([]);

const selectedSymptoms = ref([]);
const selectedFarmingConditions = ref([]);

const images = ref([]);
const imagePreviews = ref([]);

const loadingSymptoms = ref(false);
const loadingFarming = ref(false);
const submitting = ref(false);

const successMessage = ref('');
const errorMessage = ref('');

let symptomTimeout;
let farmingTimeout;

/* -------------------------
   Tag searching
------------------------- */

function searchSymptoms() {
  clearTimeout(symptomTimeout);

  symptomTimeout = setTimeout(async () => {
    loadingSymptoms.value = true;

    try {
      const response = await api.get('/diseases/tags', {
        params: {
          type: 'symptom',
          search: symptomSearch.value.trim(),
        },
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      symptomTags.value = response.data;
    } catch (error) {
      console.error('Failed to search symptoms:', error);
      symptomTags.value = [];
    } finally {
      loadingSymptoms.value = false;
    }
  }, 300);
}

function searchFarmingConditions() {
  clearTimeout(farmingTimeout);

  farmingTimeout = setTimeout(async () => {
    loadingFarming.value = true;

    try {
      const response = await api.get('/diseases/tags', {
        params: {
          type: 'farming_condition',
          search: farmingSearch.value.trim(),
        },
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      });

      farmingTags.value = response.data;
    } catch (error) {
      console.error('Failed to search farming conditions:', error);
      farmingTags.value = [];
    } finally {
      loadingFarming.value = false;
    }
  }, 300);
}

/* -------------------------
   Tag selection
------------------------- */

function selectSymptom(tag) {
  if (!selectedSymptoms.value.some(item => item._id === tag._id)) {
    selectedSymptoms.value.push(tag);
  }

  symptomSearch.value = '';
  symptomTags.value = [];
}

function removeSymptom(tag) {
  selectedSymptoms.value = selectedSymptoms.value.filter(
    item => item._id !== tag._id
  );
}

function selectFarmingCondition(tag) {
  if (
    !selectedFarmingConditions.value.some(
      item => item._id === tag._id
    )
  ) {
    selectedFarmingConditions.value.push(tag);
  }

  farmingSearch.value = '';
  farmingTags.value = [];
}

function removeFarmingCondition(tag) {
  selectedFarmingConditions.value =
    selectedFarmingConditions.value.filter(
      item => item._id !== tag._id
    );
}

/* -------------------------
   Images
------------------------- */

function handleImages(event) {
  const files = Array.from(event.target.files);

  errorMessage.value = '';

  if (images.value.length + files.length > 5) {
    errorMessage.value = 'You can upload a maximum of 5 images.';
    event.target.value = '';
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      errorMessage.value = `${file.name} is not an image.`;
      continue;
    }

    if (file.size > 5 * 1024 * 1024) {
      errorMessage.value = `${file.name} is larger than 5 MB.`;
      continue;
    }

    images.value.push(file);

    imagePreviews.value.push({
      file,
      url: URL.createObjectURL(file),
    });
  }

  event.target.value = '';
}

function removeImage(index) {
  URL.revokeObjectURL(imagePreviews.value[index].url);

  images.value.splice(index, 1);
  imagePreviews.value.splice(index, 1);
}

/* -------------------------
   Submission
------------------------- */

async function submitCase() {
  successMessage.value = '';
  errorMessage.value = '';

  if (!authState.token) {
    errorMessage.value = 'You must be logged in to submit a disease case.';
    return;
  }

  if (!cropType.value.trim()) {
    errorMessage.value = 'Crop type is required.';
    return;
  }

  const formData = new FormData();

  formData.append('cropType', cropType.value.trim());

  if (cropVariety.value.trim()) {
    formData.append('cropVariety', cropVariety.value.trim());
  }

  if (growthStage.value.trim()) {
    formData.append('growthStage', growthStage.value.trim());
  }

  if (cropAge.value.trim()) {
    formData.append('cropAge', cropAge.value.trim());
  }

  if (selectedSymptoms.value.length > 0) {
    formData.append(
      'symptoms',
      JSON.stringify(
        selectedSymptoms.value.map(tag => tag._id)
      )
    );
  }

  if (selectedFarmingConditions.value.length > 0) {
    formData.append(
      'farmingConditions',
      JSON.stringify(
        selectedFarmingConditions.value.map(tag => tag._id)
      )
    );
  }

  if (description.value.trim()) {
    formData.append(
      'description',
      description.value.trim()
    );
  }

  images.value.forEach(file => {
    formData.append('images', file);
  });

  submitting.value = true;

  try {
    const response = await api.post(
      '/diseases',
      formData,
      {
        headers: {
          Authorization: `Bearer ${authState.token}`,
        },
      }
    );

    console.log('Disease case submitted:', response.data);

    successMessage.value =
      'Disease case submitted successfully.';

    resetForm();
  } catch (error) {
    console.error('Disease submission failed:', error);

    errorMessage.value =
      error.response?.data?.message ||
      'Failed to submit disease case. Please try again.';
  } finally {
    submitting.value = false;
  }
}

/* -------------------------
   Reset
------------------------- */

function resetForm() {
  cropType.value = '';
  cropVariety.value = '';
  growthStage.value = '';
  cropAge.value = '';
  description.value = '';

  symptomSearch.value = '';
  farmingSearch.value = '';

  symptomTags.value = [];
  farmingTags.value = [];

  selectedSymptoms.value = [];
  selectedFarmingConditions.value = [];

  imagePreviews.value.forEach(preview => {
    URL.revokeObjectURL(preview.url);
  });

  images.value = [];
  imagePreviews.value = [];
}
</script>

<template>
  <main class="disease-submission-page">
    <div class="disease-container">

      <!-- Header -->
      <div class="disease-header">
        <h1>Submit Disease Case</h1>
        <p>
          Provide information about your crop and its symptoms
          to help identify possible diseases.
        </p>
      </div>

      <!-- Messages -->
      <div
        v-if="successMessage"
        class="disease-message disease-success"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="errorMessage"
        class="disease-message disease-error"
      >
        {{ errorMessage }}
      </div>

      <form @submit.prevent="submitCase">

        <!-- Crop Information -->
        <section class="disease-card">
          <div class="disease-section-header">
            <h2>Crop Information</h2>
            <p>Information about the affected crop.</p>
          </div>

          <div class="row g-3">

            <div class="col-md-6">
              <label for="cropType" class="form-label">
                Crop Type <span class="required">*</span>
              </label>

              <input
                id="cropType"
                v-model="cropType"
                type="text"
                class="form-control"
                placeholder="e.g. Rice"
                required
              />
            </div>

            <div class="col-md-6">
              <label for="cropVariety" class="form-label">
                Crop Variety
              </label>

              <input
                id="cropVariety"
                v-model="cropVariety"
                type="text"
                class="form-control"
                placeholder="e.g. BRRI dhan 28"
              />
            </div>

            <div class="col-md-6">
              <label for="growthStage" class="form-label">
                Growth Stage
              </label>

              <input
                id="growthStage"
                v-model="growthStage"
                type="text"
                class="form-control"
                placeholder="e.g. Flowering"
              />
            </div>

            <div class="col-md-6">
              <label for="cropAge" class="form-label">
                Crop Age
              </label>

              <input
                id="cropAge"
                v-model="cropAge"
                type="text"
                class="form-control"
                placeholder="e.g. 80 days"
              />
            </div>

          </div>
        </section>

        <!-- Symptoms -->
        <section class="disease-card">
          <div class="disease-section-header">
            <h2>Symptoms</h2>
            <p>
              Search for symptoms and select all that apply.
            </p>
          </div>

          <div class="disease-tag-search">

            <input
              v-model="symptomSearch"
              type="text"
              class="form-control"
              placeholder="Search symptoms..."
              @input="searchSymptoms"
              @focus="searchSymptoms"
            />

            <div
              v-if="symptomSearch || symptomTags.length"
              class="disease-tag-dropdown"
            >
              <div
                v-if="loadingSymptoms"
                class="disease-dropdown-status"
              >
                Searching...
              </div>

              <button
                v-for="tag in symptomTags"
                :key="tag._id"
                type="button"
                class="disease-tag-option"
                @click="selectSymptom(tag)"
              >
                {{ tag.name }}
              </button>

              <div
                v-if="
                  !loadingSymptoms &&
                  symptomTags.length === 0
                "
                class="disease-dropdown-status"
              >
                No matching symptoms found.
              </div>
            </div>

          </div>

          <div
            v-if="selectedSymptoms.length"
            class="disease-selected-tags"
          >
            <span
              v-for="tag in selectedSymptoms"
              :key="tag._id"
              class="disease-tag"
            >
              {{ tag.name }}

              <button
                type="button"
                @click="removeSymptom(tag)"
              >
                ×
              </button>
            </span>
          </div>
        </section>

        <!-- Farming Conditions -->
        <section class="disease-card">
          <div class="disease-section-header">
            <h2>Farming Conditions</h2>
            <p>
              Select conditions that may be relevant to the case.
            </p>
          </div>

          <div class="disease-tag-search">

            <input
              v-model="farmingSearch"
              type="text"
              class="form-control"
              placeholder="Search farming conditions..."
              @input="searchFarmingConditions"
              @focus="searchFarmingConditions"
            />

            <div
              v-if="farmingSearch || farmingTags.length"
              class="disease-tag-dropdown"
            >
              <div
                v-if="loadingFarming"
                class="disease-dropdown-status"
              >
                Searching...
              </div>

              <button
                v-for="tag in farmingTags"
                :key="tag._id"
                type="button"
                class="disease-tag-option"
                @click="selectFarmingCondition(tag)"
              >
                {{ tag.name }}
              </button>

              <div
                v-if="
                  !loadingFarming &&
                  farmingTags.length === 0
                "
                class="disease-dropdown-status"
              >
                No matching farming conditions found.
              </div>
            </div>

          </div>

          <div
            v-if="selectedFarmingConditions.length"
            class="disease-selected-tags"
          >
            <span
              v-for="tag in selectedFarmingConditions"
              :key="tag._id"
              class="disease-tag"
            >
              {{ tag.name }}

              <button
                type="button"
                @click="removeFarmingCondition(tag)"
              >
                ×
              </button>
            </span>
          </div>
        </section>

        <!-- Images -->
        <section class="disease-card">
          <div class="disease-section-header">
            <h2>Crop / Leaf Images</h2>
            <p>
              Upload up to 5 images. Each image can be up to 5 MB.
            </p>
          </div>

          <label class="disease-upload-area">

            <input
              type="file"
              accept="image/*"
              multiple
              @change="handleImages"
            />

            <div class="disease-upload-icon">+</div>

            <strong>Choose images</strong>

            <span>
              Click here to select crop or leaf images
            </span>

          </label>

          <div
            v-if="imagePreviews.length"
            class="disease-image-grid"
          >
            <div
              v-for="(preview, index) in imagePreviews"
              :key="preview.url"
              class="disease-image-preview"
            >
              <img
                :src="preview.url"
                :alt="`Crop image ${index + 1}`"
              />

              <button
                type="button"
                class="disease-remove-image"
                @click="removeImage(index)"
              >
                ×
              </button>
            </div>
          </div>

          <div class="disease-image-count">
            {{ images.length }} / 5 images selected
          </div>
        </section>

        <!-- Description -->
        <section class="disease-card">
          <div class="disease-section-header">
            <h2>Additional Description</h2>
            <p>
              Describe anything else that may help with diagnosis.
            </p>
          </div>

          <textarea
            v-model="description"
            class="form-control"
            rows="6"
            placeholder="Describe what you have observed..."
          ></textarea>
        </section>

        <!-- Submit -->
        <div class="disease-submit-area">
          <button
            type="submit"
            class="btn-pill disease-submit-button"
            :disabled="submitting"
          >
            {{ submitting ? 'Submitting...' : 'Submit Disease Case' }}
          </button>
        </div>

      </form>
    </div>
  </main>
</template>

