<template>
  <div class="timeline-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Activity Timeline</h1>
        <p>
          Track your farming activities, diagnoses, consultations and
          recommendations in one place.
        </p>
      </div>

      <button
        class="refresh-button"
        :disabled="loading"
        @click="loadTimeline"
      >
        <span v-if="loading">Loading...</span>
        <span v-else>↻ Refresh</span>
      </button>
    </div>

    <!-- Filters -->
    <section class="filters-card">
      <div class="filter-group">
        <label>Activity type</label>

        <div class="filter-buttons">
          <button
            v-for="filter in filters"
            :key="filter.value"
            :class="[
              'filter-button',
              { active: selectedType === filter.value }
            ]"
            @click="changeType(filter.value)"
          >
            <span>{{ filter.icon }}</span>
            {{ filter.label }}
          </button>
        </div>
      </div>

      <div class="date-filters">
        <div>
          <label for="from-date">From</label>
          <input
            id="from-date"
            v-model="fromDate"
            type="date"
            @change="applyDateFilter"
          />
        </div>

        <div>
          <label for="to-date">To</label>
          <input
            id="to-date"
            v-model="toDate"
            type="date"
            @change="applyDateFilter"
          />
        </div>

        <button
          v-if="fromDate || toDate"
          class="clear-date-button"
          @click="clearDates"
        >
          Clear dates
        </button>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="state-card">
      <div class="spinner"></div>
      <p>Loading activity timeline...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="state-card error-state">
      <div class="state-icon">!</div>
      <h3>Unable to load timeline</h3>
      <p>{{ error }}</p>

      <button class="retry-button" @click="loadTimeline">
        Try again
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="activities.length === 0" class="state-card">
      <div class="state-icon">📋</div>
      <h3>No activities found</h3>
      <p>
        There are no activities matching your current filters.
      </p>
    </div>

    <!-- Timeline -->
    <section v-else class="timeline-container">
      <div class="timeline-summary">
        <span>
          {{ pagination.total }}
          {{ pagination.total === 1 ? 'activity' : 'activities' }}
        </span>

        <span v-if="selectedType !== 'all'">
          · {{ selectedFilterLabel }}
        </span>
      </div>

      <div class="timeline">
        <article
          v-for="activity in activities"
          :key="activity.id"
          class="timeline-item"
        >
          <!-- Timeline line -->
          <div class="timeline-marker-wrapper">
            <div
              class="timeline-marker"
              :class="`marker-${activity.type}`"
            >
              {{ activityIcon(activity) }}
            </div>
          </div>

          <!-- Activity card -->
          <div class="activity-card">
            <!-- Date -->
            <div class="activity-date">
              {{ formatDate(activity.date) }}
              <span>•</span>
              {{ formatTime(activity.date) }}
            </div>

            <!-- Main content -->
            <div class="activity-content">
              <div class="activity-heading">
                <div>
                  <div class="activity-type">
                    {{ activityTypeLabel(activity) }}
                  </div>

                  <h2>{{ activity.title }}</h2>
                </div>

                <span
                  class="status-badge"
                  :class="`status-${activity.status}`"
                >
                  {{ formatStatus(activity.status) }}
                </span>
              </div>

              <p class="activity-description">
                {{ activity.description }}
              </p>

              <!-- Crop -->
              <div
                v-if="activity.crop"
                class="crop-info"
              >
                <div class="crop-icon">
                  🌱
                </div>

                <div>
                  <strong>
                    {{ activity.crop.name || activity.crop.type }}
                  </strong>

                  <span>
                    {{ cropDescription(activity.crop) }}
                  </span>
                </div>
              </div>

              <!-- Activity details -->
              <div
                v-if="hasActivityDetails(activity)"
                class="activity-details"
              >
                <!-- Harvest -->
                <template
                  v-if="
                    activity.type === 'farming' &&
                    activity.subtype === 'harvest'
                  "
                >
                  <div class="detail">
                    <span class="detail-label">Quantity</span>
                    <strong>
                      {{ activity.data.quantity }}
                      {{ activity.data.unit }}
                    </strong>
                  </div>

                  <div
                    v-if="activity.data.quality"
                    class="detail"
                  >
                    <span class="detail-label">Quality</span>
                    <strong>{{ activity.data.quality }}</strong>
                  </div>
                </template>

                <!-- Crop created -->
                <template
                  v-else-if="
                    activity.type === 'farming' &&
                    activity.subtype === 'crop_created'
                  "
                >
                  <div
                    v-if="activity.data.location"
                    class="detail"
                  >
                    <span class="detail-label">Location</span>
                    <strong>{{ activity.data.location }}</strong>
                  </div>

                  <div
                    v-if="activity.crop.area"
                    class="detail"
                  >
                    <span class="detail-label">Area</span>
                    <strong>
                      {{ activity.crop.area }}
                      {{ activity.crop.areaUnit }}
                    </strong>
                  </div>

                  <div
                    v-if="activity.data.expectedHarvestDate"
                    class="detail"
                  >
                    <span class="detail-label">Expected harvest</span>
                    <strong>
                      {{ formatDateOnly(activity.data.expectedHarvestDate) }}
                    </strong>
                  </div>
                </template>

                <!-- Diagnosis -->
                <template
                  v-else-if="activity.type === 'disease'"
                >
                  <div
                    v-if="activity.data?.symptoms?.length"
                    class="detail detail-wide"
                  >
                    <span class="detail-label">Symptoms</span>

                    <div class="tags">
                      <span
                        v-for="symptom in activity.data.symptoms"
                        :key="symptom.id || symptom.name"
                        class="tag"
                      >
                        {{ symptom.name }}
                      </span>
                    </div>
                  </div>

                  <div
                    v-if="activity.data?.farmingConditions?.length"
                    class="detail detail-wide"
                  >
                    <span class="detail-label">Farming conditions</span>

                    <div class="tags">
                      <span
                        v-for="condition in activity.data.farmingConditions"
                        :key="condition.id || condition.name"
                        class="tag condition-tag"
                      >
                        {{ condition.name }}
                      </span>
                    </div>
                  </div>

                  <div
                    v-if="activity.subtype === 'possible_match'"
                    class="match-detail"
                  >
                    <div class="match-header">
                      <span>Possible match</span>
                      <strong>
                        {{ activity.data.matchPercentage }}%
                      </strong>
                    </div>

                    <div class="match-bar">
                      <div
                        class="match-progress"
                        :style="{
                          width: `${activity.data.matchPercentage || 0}%`
                        }"
                      ></div>
                    </div>

                    <div class="match-disease">
                      {{ activity.data.diseaseName }}
                    </div>
                  </div>
                </template>

                <!-- Recommendation -->
                <template
                  v-else-if="activity.type === 'recommendation'"
                >
                  <div
                    v-if="activity.data?.cropType"
                    class="detail"
                  >
                    <span class="detail-label">Crop type</span>
                    <strong>
                      {{ activity.data.cropType }}
                    </strong>
                  </div>
                </template>

                <!-- Consultation -->
                <template
                  v-else-if="activity.type === 'consultation'"
                >
                  <div
                    v-if="activity.data?.expertName"
                    class="detail"
                  >
                    <span class="detail-label">Expert</span>
                    <strong>
                      {{ activity.data.expertName }}
                    </strong>
                  </div>

                  <div
                    v-if="activity.data?.topic"
                    class="detail"
                  >
                    <span class="detail-label">Topic</span>
                    <strong>
                      {{ activity.data.topic }}
                    </strong>
                  </div>
                </template>
              </div>

              <!-- Disease image -->
              <div
                v-if="
                  activity.type === 'disease' &&
                  activity.data?.images?.length
                "
                class="disease-image"
              >
                <img
                  :src="getImageUrl(activity.data.images[0])"
                  alt="Disease case"
                />
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.pages > 1"
        class="pagination"
      >
        <button
          :disabled="!pagination.hasPreviousPage || loading"
          @click="changePage(pagination.page - 1)"
        >
          ← Previous
        </button>

        <span>
          Page {{ pagination.page }} of {{ pagination.pages }}
        </span>

        <button
          :disabled="!pagination.hasNextPage || loading"
          @click="changePage(pagination.page + 1)"
        >
          Next →
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getActivityTimeline } from '../services/activityTimelineService'

const activities = ref([])
const loading = ref(false)
const error = ref(null)

const selectedType = ref('all')
const fromDate = ref('')
const toDate = ref('')

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  pages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
})

const filters = [
  {
    value: 'all',
    label: 'All',
    icon: '📋',
  },
  {
    value: 'disease',
    label: 'Diagnosis',
    icon: '🩺',
  },
  {
    value: 'consultation',
    label: 'Consultations',
    icon: '👨‍🌾',
  },
  {
    value: 'recommendation',
    label: 'Recommendations',
    icon: '💡',
  },
  {
    value: 'farming',
    label: 'Farming',
    icon: '🌱',
  },
]

const selectedFilterLabel = computed(() => {
  const filter = filters.find(
    item => item.value === selectedType.value
  )

  return filter?.label || 'All'
})

async function loadTimeline() {
  loading.value = true
  error.value = null

  try {
    const response = await getActivityTimeline({
      page: pagination.value.page,
      limit: pagination.value.limit,
      type: selectedType.value,
      from: fromDate.value || null,
      to: toDate.value || null,
    })

    if (!response.success) {
      throw new Error(
        response.message || 'Failed to load activity timeline'
      )
    }

    activities.value = response.data || []

    pagination.value = {
      page: response.pagination?.page || 1,
      limit: response.pagination?.limit || 10,
      total: response.pagination?.total || 0,
      pages: response.pagination?.pages || 1,
      hasNextPage: response.pagination?.hasNextPage || false,
      hasPreviousPage:
        response.pagination?.hasPreviousPage || false,
    }
  } catch (err) {
    console.error('Activity timeline error:', err)

    error.value =
      err.response?.data?.message ||
      err.message ||
      'Something went wrong while loading the timeline.'
  } finally {
    loading.value = false
  }
}

function changeType(type) {
  selectedType.value = type
  pagination.value.page = 1

  loadTimeline()
}

function applyDateFilter() {
  pagination.value.page = 1
  loadTimeline()
}

function clearDates() {
  fromDate.value = ''
  toDate.value = ''
  pagination.value.page = 1

  loadTimeline()
}

function changePage(page) {
  if (page < 1 || page > pagination.value.pages) {
    return
  }

  pagination.value.page = page
  loadTimeline()

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function activityIcon(activity) {
  if (activity.type === 'disease') {
    return activity.subtype === 'possible_match'
      ? '🔎'
      : '🩺'
  }

  if (activity.type === 'recommendation') {
    return '💡'
  }

  if (activity.type === 'consultation') {
    return '👨‍🌾'
  }

  if (activity.type === 'farming') {
    if (activity.subtype === 'harvest') {
      return '🌾'
    }

    if (activity.subtype === 'planting') {
      return '🌱'
    }

    if (activity.subtype === 'crop_created') {
      return '➕'
    }

    return '🚜'
  }

  return '📋'
}

function activityTypeLabel(activity) {
  if (activity.type === 'disease') {
    if (activity.subtype === 'possible_match') {
      return 'Diagnosis'
    }

    return 'Disease case'
  }

  if (activity.type === 'recommendation') {
    return 'Recommendation'
  }

  if (activity.type === 'consultation') {
    return 'Consultation'
  }

  if (activity.type === 'farming') {
    if (activity.subtype === 'harvest') {
      return 'Harvest'
    }

    if (activity.subtype === 'planting') {
      return 'Planting'
    }

    if (activity.subtype === 'crop_created') {
      return 'Crop activity'
    }

    return 'Farming activity'
  }

  return activity.type
}

function formatStatus(status) {
  if (!status) {
    return 'Unknown'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

function formatDateOnly(date) {
  if (!date) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

function formatTime(date) {
  if (!date) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function cropDescription(crop) {
  const parts = []

  if (crop.type) {
    parts.push(crop.type)
  }

  if (crop.variety) {
    parts.push(crop.variety)
  }

  if (crop.season) {
    parts.push(crop.season)
  }

  return parts.join(' • ')
}

function hasActivityDetails(activity) {
  return Boolean(
    activity.data &&
    Object.keys(activity.data).length
  )
}

function getImageUrl(path) {
  if (!path) {
    return ''
  }

  if (path.startsWith('http')) {
    return path
  }

  return `http://localhost:5000${path}`
}

onMounted(() => {
  loadTimeline()
})
</script>

<style scoped>
.timeline-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 60px;
}

/* Header */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 28px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 700;
}

.page-header p {
  margin: 0;
  color: var(--text-muted);
}

.refresh-button {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.refresh-button:hover {
  background: var(--bg);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Filters */

.filters-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.filter-group label,
.date-filters label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-button {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 14px;
}

.filter-button:hover {
  background: var(--bg);
}

.filter-button.active {
  background: var(--brand-fill);
  color: #ffffff;
  border-color: var(--brand-fill);
}

.date-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 18px;
}

.date-filters input {
  height: 38px;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  padding: 0 10px;
}

.clear-date-button {
  height: 38px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
}

/* Timeline */

.timeline-summary {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 20px;
}

.timeline {
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 23px;
  top: 25px;
  bottom: 25px;
  width: 2px;
  background: var(--border);
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 18px;
  margin-bottom: 24px;
}

.timeline-marker-wrapper {
  position: relative;
  z-index: 2;
}

.timeline-marker {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--border);
  font-size: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.marker-disease {
  border-color: var(--danger);
}

.marker-recommendation {
  border-color: var(--gold);
}

.marker-consultation {
  border-color: var(--info-100);
}

.marker-farming {
  border-color: var(--green-50);
}

/* Activity card */

.activity-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.activity-date {
  display: flex;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 10px;
}

.activity-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.activity-type {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.activity-heading h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-dark);
}

.activity-description {
  color: var(--text-muted);
  line-height: 1.6;
  margin: 10px 0 16px;
}

.status-badge {
  flex-shrink: 0;
  height: fit-content;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
}

.status-completed {
  background: var(--green-50);
  color: var(--green-700);
}

.status-active {
  background: var(--info-100);
  color: var(--info);
}

.status-pending {
  background: rgba(255,193,7,.12);
  color: var(--warning);
}

.status-cancelled,
.status-rejected {
  background: var(--danger-100);
  color: var(--danger);
}

/* Crop */

.crop-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.crop-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--green-50);
}

.crop-info strong,
.crop-info span {
  display: block;
}

.crop-info strong {
  font-size: 14px;
}

.crop-info span {
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 2px;
}

/* Details */

.activity-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.detail {
  min-width: 150px;
  background: var(--bg);
  border-radius: 8px;
  padding: 10px 12px;
}

.detail-wide {
  width: 100%;
}

.detail-label {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 5px;
}

.detail strong {
  font-size: 14px;
  color: var(--text-dark);
}

/* Tags */

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: var(--danger-100);
  color: var(--danger);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 600;
}

.condition-tag {
  background: rgba(255,193,7,.12);
  color: var(--warning);
}

/* Match */

.match-detail {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg);
}

.match-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}

.match-header strong {
  font-size: 15px;
}

.match-bar {
  height: 7px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.match-progress {
  height: 100%;
  background: var(--gold);
  border-radius: inherit;
}

.match-disease {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
}

/* Disease image */

.disease-image {
  margin-top: 16px;
}

.disease-image img {
  width: 180px;
  height: 130px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* State */

.state-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 50px 20px;
  text-align: center;
}

.state-card p {
  color: var(--text-muted);
}

.state-icon {
  font-size: 34px;
  margin-bottom: 10px;
}

.error-state {
  border-color: var(--danger);
}

.retry-button {
  border: none;
  background: var(--brand-fill);
  color: #ffffff;
  padding: 9px 16px;
  border-radius: 7px;
  cursor: pointer;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--text-dark);
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Pagination */

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 30px;
}

.pagination button {
  border: 1px solid var(--border-strong);
  background: var(--surface);
  border-radius: 7px;
  padding: 8px 14px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Responsive */

@media (max-width: 700px) {
  .timeline-page {
    padding: 20px 14px 40px;
  }

  .page-header {
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .date-filters {
    flex-wrap: wrap;
  }

  .timeline-item {
    grid-template-columns: 38px 1fr;
    gap: 12px;
  }

  .timeline::before {
    left: 18px;
  }

  .timeline-marker {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }

  .activity-heading {
    flex-direction: column;
    gap: 8px;
  }

  .status-badge {
    width: fit-content;
  }
}
</style>
