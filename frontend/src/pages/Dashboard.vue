<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import { authState } from '../stores/auth'
import ExpertDashboard from '../components/ExpertDashboard.vue'
import OrganizationDashboard from '../components/OrganizationDashboard.vue'
import AdminDashboard from '../components/AdminDashboard.vue'

// The farmer dashboard is the default view
const role = computed(() => authState.user?.role || 'farmer')

const loading = ref(true)
const error = ref('')

const dashboard = ref({
  cropHealth: {
    cropCount: 0,
    activeCrops: 0,
    diseaseCases: {
      total: 0,
      pending: 0,
      resolved: 0,
      active: 0
    },
    recentDiagnosisUpdates: []
  },

  farmingAnalytics: {
    totals: {
      production: 0,
      productionUnit: 'kg',
      fertilizer: 0,
      fertilizerUnit: 'kg',
      pesticide: 0,
      pesticideUnit: 'L',
      expenses: 0
    },
    crops: []
  },

  // TODO:
  // Replace these static recommendation values with the
  // recommendation API once that feature is implemented.
  recommendationSummary: {
    total: 3,
    pending: 1,
    completed: 2,
    recent: [
      {
        title: 'Monitor crop health',
        description:
          'Continue monitoring the crop for visible symptoms.',
        status: 'active'
      },
      {
        title: 'Fertilizer application',
        description:
          'Review fertilizer application schedule.',
        status: 'completed'
      },
      {
        title: 'Pest monitoring',
        description:
          'Monitor the field for signs of pest activity.',
        status: 'completed'
      }
    ]
  },

  // TODO:
  // Replace these static consultation values with the
  // consultation API once that feature is implemented.
  consultationSummary: {
    total: 2,
    pending: 1,
    completed: 1,
    recent: [
      {
        topic: 'Crop health consultation',
        status: 'completed',
        date: '2026-08-10'
      },
      {
        topic: 'Pest management consultation',
        status: 'pending',
        date: '2026-08-15'
      }
    ]
  }
})

function authHeader() {
  return {
    Authorization: `Bearer ${authState.token}`
  }
}

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    const response = await api.get(
      '/dashboard',
      {
        headers: authHeader()
      }
    )

    dashboard.value = {
      ...dashboard.value,
      ...response.data,

      // Keep the static values until those APIs exist.
      recommendationSummary:
        response.data.recommendationSummary ||
        dashboard.value.recommendationSummary,

      consultationSummary:
        response.data.consultationSummary ||
        dashboard.value.consultationSummary
    }
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Unable to load dashboard.'
  } finally {
    loading.value = false
  }
}

function formatNumber(value) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return '0'
  }

  return new Intl.NumberFormat('en-US').format(number)
}

function formatDate(value) {
  if (!value) {
    return 'Unknown date'
  }

  return new Date(value).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  )
}

function statusClass(status) {
  switch (status) {
    case 'pending':
      return 'dashboard-status-pending'

    case 'active':
      return 'dashboard-status-active'

    case 'completed':
      return 'dashboard-status-completed'

    case 'resolved':
      return 'dashboard-status-resolved'

    default:
      return ''
  }
}

const cropHealth = computed(
  () => dashboard.value.cropHealth
)

const farmingAnalytics = computed(
  () => dashboard.value.farmingAnalytics
)

const recommendationSummary = computed(
  () => dashboard.value.recommendationSummary
)

const consultationSummary = computed(
  () => dashboard.value.consultationSummary
)

const totalProduction = computed(
  () =>
    farmingAnalytics.value.totals?.production ?? 0
)

const totalExpenses = computed(
  () =>
    farmingAnalytics.value.totals?.expenses ?? 0
)

const totalCrops = computed(
  () =>
    cropHealth.value.cropCount ?? 0
)

const activeCrops = computed(
  () =>
    cropHealth.value.activeCrops ?? 0
)

const diseaseCases = computed(
  () =>
    cropHealth.value.diseaseCases?.total ?? 0
)

const pendingDiseases = computed(
  () =>
    cropHealth.value.diseaseCases?.pending ?? 0
)

const resolvedDiseases = computed(
  () =>
    cropHealth.value.diseaseCases?.resolved ?? 0
)

const activeDiseases = computed(
  () =>
    cropHealth.value.diseaseCases?.active ?? 0
)

onMounted(loadDashboard)
</script>

<template>

  <!-- Non-farmer roles get their own dashboard; the farmer view below is
       the original dashboard and is left untouched. -->
  <ExpertDashboard v-if="role === 'expert'" />
  <OrganizationDashboard v-else-if="role === 'organization_owner' || role === 'market'" />
  <AdminDashboard v-else-if="role === 'admin'" />

  <div v-else class="dashboard-container">

    <!-- Header -->

    <header class="dashboard-header">

      <h1>Farm Dashboard</h1>

      <p>
        Monitor crop health, farming performance,
        expenses, recommendations and consultations.
      </p>

    </header>


    <!-- Error -->

    <div
      v-if="error"
      class="dashboard-error"
    >
      {{ error }}
    </div>


    <!-- Loading -->

    <div
      v-if="loading"
      class="dashboard-loading"
    >
      Loading dashboard...
    </div>


    <template v-else>


      <!-- =====================================================
           SUMMARY CARDS
           ===================================================== -->

      <section class="dashboard-summary-grid">

        <!-- Crops -->

        <div class="card dashboard-summary-card">

          <span class="dashboard-summary-label">
            Total Crops
          </span>

          <span class="dashboard-summary-value">
            {{ formatNumber(totalCrops) }}
          </span>

          <span class="dashboard-summary-subtext">
            {{ formatNumber(activeCrops) }} active
          </span>

        </div>


        <!-- Production -->

        <div class="card dashboard-summary-card">

          <span class="dashboard-summary-label">
            Total Production
          </span>

          <span class="dashboard-summary-value">
            {{ formatNumber(totalProduction) }}
          </span>

          <span class="dashboard-summary-subtext">
            {{ farmingAnalytics.totals?.productionUnit || 'kg' }}
          </span>

        </div>


        <!-- Expenses -->

        <div class="card dashboard-summary-card">

          <span class="dashboard-summary-label">
            Total Expenses
          </span>

          <span class="dashboard-summary-value">
            {{ formatNumber(totalExpenses) }}
          </span>

          <span class="dashboard-summary-subtext">
            Farming expenses
          </span>

        </div>


        <!-- Disease cases -->

        <div class="card dashboard-summary-card">

          <span class="dashboard-summary-label">
            Disease Cases
          </span>

          <span class="dashboard-summary-value">
            {{ formatNumber(diseaseCases) }}
          </span>

          <span class="dashboard-summary-subtext">
            {{ formatNumber(pendingDiseases) }} pending
          </span>

        </div>

      </section>



      <!-- =====================================================
           CROP HEALTH + FARMING ANALYTICS
           ===================================================== -->

      <section class="dashboard-grid">


        <!-- Crop Health -->

        <div class="card dashboard-card">

          <div class="dashboard-card-header">

            <h2>
              Crop Health Summary
            </h2>

            <p>
              Current health and disease status across
              your farm.
            </p>

          </div>


          <div class="dashboard-health-list">

            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Total crops
              </span>

              <span class="dashboard-health-value">
                {{ totalCrops }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Active crops
              </span>

              <span class="dashboard-health-value">
                {{ activeCrops }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Disease cases
              </span>

              <span class="dashboard-health-value">
                {{ diseaseCases }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Pending cases
              </span>

              <span class="dashboard-health-value">
                {{ pendingDiseases }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Active cases
              </span>

              <span class="dashboard-health-value">
                {{ activeDiseases }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Resolved cases
              </span>

              <span class="dashboard-health-value">
                {{ resolvedDiseases }}
              </span>

            </div>

          </div>

        </div>



        <!-- Farming Analytics -->

        <div class="card dashboard-card">

          <div class="dashboard-card-header">

            <h2>
              Farming Analytics
            </h2>

            <p>
              Overall production, inputs and farming costs.
            </p>

          </div>


          <div class="dashboard-analytics-list">

            <div class="dashboard-analytics-row">

              <span class="dashboard-analytics-label">
                Production
              </span>

              <span class="dashboard-analytics-value">
                {{ formatNumber(totalProduction) }}
                {{ farmingAnalytics.totals?.productionUnit || 'kg' }}
              </span>

            </div>


            <div class="dashboard-analytics-row">

              <span class="dashboard-analytics-label">
                Fertilizer
              </span>

              <span class="dashboard-analytics-value">
                {{ formatNumber(
                  farmingAnalytics.totals?.fertilizer
                ) }}
                {{ farmingAnalytics.totals?.fertilizerUnit || 'kg' }}
              </span>

            </div>


            <div class="dashboard-analytics-row">

              <span class="dashboard-analytics-label">
                Pesticide
              </span>

              <span class="dashboard-analytics-value">
                {{ formatNumber(
                  farmingAnalytics.totals?.pesticide
                ) }}
                {{ farmingAnalytics.totals?.pesticideUnit || 'L' }}
              </span>

            </div>


            <div class="dashboard-analytics-row">

              <span class="dashboard-analytics-label">
                Expenses
              </span>

              <span class="dashboard-analytics-value">
                {{ formatNumber(totalExpenses) }}
              </span>

            </div>

          </div>

        </div>

      </section>



      <!-- =====================================================
           CROP PERFORMANCE
           ===================================================== -->

      <section class="card dashboard-card mb-4">

        <div class="dashboard-card-header">

          <h2>
            Crop Performance
          </h2>

          <p>
            Production and yield information for each crop.
          </p>

        </div>


        <div
          v-if="!farmingAnalytics.crops?.length"
          class="dashboard-empty"
        >
          No crop performance data available.
        </div>


        <div
          v-else
          class="dashboard-crop-list"
        >

          <div
            v-for="item in farmingAnalytics.crops"
            :key="item.crop.id"
            class="dashboard-crop-item"
          >

            <div class="dashboard-crop-header">

              <div>

                <div class="dashboard-crop-name">
                  {{ item.crop.name }}
                </div>

                <div class="dashboard-crop-type">
                  {{ item.crop.cropType }}

                  <span
                    v-if="item.crop.variety"
                  >
                    · {{ item.crop.variety }}
                  </span>
                </div>

              </div>


              <span
                class="dashboard-status dashboard-status-active"
              >
                {{ item.crop.status }}
              </span>

            </div>


            <div class="dashboard-crop-stats">

              <div class="dashboard-crop-stat">

                <span class="dashboard-crop-stat-label">
                  Production
                </span>

                <span class="dashboard-crop-stat-value">

                  {{ formatNumber(
                    item.production?.totalQuantity
                  ) }}

                  {{ item.production?.unit || 'kg' }}

                </span>

              </div>


              <div class="dashboard-crop-stat">

                <span class="dashboard-crop-stat-label">
                  Yield / Acre
                </span>

                <span class="dashboard-crop-stat-value">

                  {{ formatNumber(
                    item.production?.yieldPerAcre
                  ) }}

                  {{ item.production?.unit || 'kg' }}

                </span>

              </div>


              <div class="dashboard-crop-stat">

                <span class="dashboard-crop-stat-label">
                  Expenses
                </span>

                <span class="dashboard-crop-stat-value">

                  {{ formatNumber(
                    item.expenses?.total
                  ) }}

                </span>

              </div>

            </div>

          </div>

        </div>

      </section>



      <!-- =====================================================
           RECOMMENDATIONS + CONSULTATIONS
           ===================================================== -->

      <section class="dashboard-grid">


        <!-- Recommendations -->

        <div class="card dashboard-card">

          <div class="dashboard-card-header">

            <h2>
              Recommendation Summary
            </h2>

            <p>
              Recent farming recommendations.
            </p>

          </div>


          <div class="dashboard-health-list mb-4">

            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Total
              </span>

              <span class="dashboard-health-value">
                {{ recommendationSummary.total }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Pending
              </span>

              <span class="dashboard-health-value">
                {{ recommendationSummary.pending }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Completed
              </span>

              <span class="dashboard-health-value">
                {{ recommendationSummary.completed }}
              </span>

            </div>

          </div>


          <div class="dashboard-item-list">

            <div
              v-for="item in recommendationSummary.recent"
              :key="item.title"
              class="dashboard-item"
            >

              <div class="dashboard-item-header">

                <span class="dashboard-item-title">
                  {{ item.title }}
                </span>

                <span
                  class="dashboard-status"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>

              </div>

              <p class="dashboard-item-description">
                {{ item.description }}
              </p>

            </div>

          </div>

        </div>



        <!-- Consultations -->

        <div class="card dashboard-card">

          <div class="dashboard-card-header">

            <h2>
              Consultation Summary
            </h2>

            <p>
              Recent agricultural consultations.
            </p>

          </div>


          <div class="dashboard-health-list mb-4">

            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Total
              </span>

              <span class="dashboard-health-value">
                {{ consultationSummary.total }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Pending
              </span>

              <span class="dashboard-health-value">
                {{ consultationSummary.pending }}
              </span>

            </div>


            <div class="dashboard-health-row">

              <span class="dashboard-health-label">
                Completed
              </span>

              <span class="dashboard-health-value">
                {{ consultationSummary.completed }}
              </span>

            </div>

          </div>


          <div class="dashboard-item-list">

            <div
              v-for="item in consultationSummary.recent"
              :key="item.topic"
              class="dashboard-item"
            >

              <div class="dashboard-item-header">

                <span class="dashboard-item-title">
                  {{ item.topic }}
                </span>

                <span
                  class="dashboard-status"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>

              </div>

              <p class="dashboard-item-description">
                {{ formatDate(item.date) }}
              </p>

            </div>

          </div>

        </div>

      </section>



      <!-- =====================================================
           RECENT DIAGNOSIS UPDATES
           ===================================================== -->

      <section class="card dashboard-card mb-4">

        <div class="dashboard-card-header">

          <h2>
            Recent Diagnosis Updates
          </h2>

          <p>
            Latest disease cases submitted for your crops.
          </p>

        </div>


        <div
          v-if="
            !cropHealth.recentDiagnosisUpdates?.length
          "
          class="dashboard-empty"
        >
          No recent diagnosis updates.
        </div>


        <div
          v-else
          class="dashboard-diagnosis-list"
        >

          <div
            v-for="diagnosis in cropHealth.recentDiagnosisUpdates"
            :key="diagnosis.id"
            class="dashboard-diagnosis-item"
          >

            <div class="dashboard-diagnosis-header">

              <div>

                <div class="dashboard-diagnosis-crop">

                  {{ diagnosis.crop?.type || 'Unknown crop' }}

                  <span
                    v-if="diagnosis.crop?.variety"
                  >
                    · {{ diagnosis.crop.variety }}
                  </span>

                </div>

              </div>


              <div>

                <span
                  class="dashboard-status"
                  :class="statusClass(diagnosis.status)"
                >
                  {{ diagnosis.status }}
                </span>

              </div>

            </div>


            <div
              v-if="diagnosis.description"
              class="dashboard-item-description"
            >
              {{ diagnosis.description }}
            </div>


            <div class="dashboard-symptoms">

              <span
                v-for="symptom in diagnosis.symptoms"
                :key="symptom.id"
                class="dashboard-symptom"
              >
                {{ symptom.name }}
              </span>

            </div>


            <div class="dashboard-diagnosis-date mt-2">

              Submitted:
              {{ formatDate(diagnosis.createdAt) }}

            </div>

          </div>

        </div>

      </section>



      <!-- =====================================================
           SUMMARY / VISUAL DATA
           ===================================================== -->

      <section class="card dashboard-card">

        <div class="dashboard-card-header">

          <h2>
            Farm Performance Overview
          </h2>

          <p>
            Quick comparison of your main farming metrics.
          </p>

        </div>


        <div class="dashboard-crop-list">


          <!-- Production -->

          <div class="dashboard-crop-item">

            <div class="dashboard-crop-header">

              <span class="dashboard-crop-name">
                Production
              </span>

              <strong>
                {{ formatNumber(totalProduction) }}
                {{ farmingAnalytics.totals?.productionUnit || 'kg' }}
              </strong>

            </div>

          </div>


          <!-- Expenses -->

          <div class="dashboard-crop-item">

            <div class="dashboard-crop-header">

              <span class="dashboard-crop-name">
                Expenses
              </span>

              <strong>
                {{ formatNumber(totalExpenses) }}
              </strong>

            </div>

          </div>


          <!-- Fertilizer -->

          <div class="dashboard-crop-item">

            <div class="dashboard-crop-header">

              <span class="dashboard-crop-name">
                Fertilizer Usage
              </span>

              <strong>
                {{ formatNumber(
                  farmingAnalytics.totals?.fertilizer
                ) }}
                {{ farmingAnalytics.totals?.fertilizerUnit || 'kg' }}
              </strong>

            </div>

          </div>


          <!-- Pesticide -->

          <div class="dashboard-crop-item">

            <div class="dashboard-crop-header">

              <span class="dashboard-crop-name">
                Pesticide Usage
              </span>

              <strong>
                {{ formatNumber(
                  farmingAnalytics.totals?.pesticide
                ) }}
                {{ farmingAnalytics.totals?.pesticideUnit || 'L' }}
              </strong>

            </div>

          </div>


        </div>

      </section>

    </template>

  </div>

</template>
