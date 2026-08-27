<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = 'http://localhost:5000/api'

const performance = ref(null)

const loading = ref(false)
const errorMessage = ref('')

const selectedCrop = ref(null)
const cropPerformance = ref(null)
const loadingCrop = ref(false)

function getToken() {
  return localStorage.getItem('token')
}

async function loadFarmPerformance() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(
      `${API_BASE}/farms/performance`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load farm performance.'
      )
    }

    performance.value = data
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

async function loadCropPerformance(crop) {
  selectedCrop.value = crop
  cropPerformance.value = null
  loadingCrop.value = true

  try {
    const response = await fetch(
      `${API_BASE}/crops/${crop.crop.id}/performance`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load crop performance.'
      )
    }

    cropPerformance.value = data
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingCrop.value = false
  }
}

function closeCropDetails() {
  selectedCrop.value = null
  cropPerformance.value = null
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
    return 'Not available'
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

function formatExpense(value) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(number)
}

onMounted(() => {
  loadFarmPerformance()
})
</script>

<template>
  <div class="seasonal-performance-container">

    <!-- Header -->

    <div class="seasonal-performance-header">
      <h1>Seasonal Farm Performance</h1>

      <p>
        Review your farm's production, resource usage,
        farming cycles, and expenses across crops.
      </p>
    </div>


    <!-- Error -->

    <div
      v-if="errorMessage"
      class="seasonal-performance-message seasonal-performance-error"
    >
      {{ errorMessage }}
    </div>


    <!-- Loading -->

    <div
      v-if="loading"
      class="seasonal-performance-loading"
    >
      Loading farm performance...
    </div>


    <template v-else-if="performance">

      <!-- Farm overview -->

      <section class="seasonal-performance-summary">

        <div class="seasonal-performance-card">
          <span class="seasonal-performance-label">
            Crops
          </span>

          <strong class="seasonal-performance-value">
            {{ performance.cropCount }}
          </strong>

          <span class="seasonal-performance-subtext">
            Active crop records
          </span>
        </div>


        <div class="seasonal-performance-card">
          <span class="seasonal-performance-label">
            Total Production
          </span>

          <strong class="seasonal-performance-value">
            {{ formatNumber(performance.totals.production) }}
            kg
          </strong>

          <span class="seasonal-performance-subtext">
            Across all crops
          </span>
        </div>


        <div class="seasonal-performance-card">
          <span class="seasonal-performance-label">
            Total Expenses
          </span>

          <strong class="seasonal-performance-value">
            {{ formatExpense(performance.totals.expenses) }}
          </strong>

          <span class="seasonal-performance-subtext">
            Recorded farm expenses
          </span>
        </div>


        <div class="seasonal-performance-card">
          <span class="seasonal-performance-label">
            Fertilizer Usage
          </span>

          <strong class="seasonal-performance-value">
            {{ formatNumber(performance.totals.fertilizer) }}
            kg
          </strong>

          <span class="seasonal-performance-subtext">
            Total recorded usage
          </span>
        </div>

      </section>


      <!-- Crop performance -->

      <section class="seasonal-performance-section">

        <div class="seasonal-performance-section-header">
          <div>
            <h2>Crop Performance</h2>

            <p>
              Compare the performance of each crop in your farm.
            </p>
          </div>
        </div>


        <div
          v-if="performance.crops.length === 0"
          class="seasonal-performance-empty"
        >
          No crop performance data is available yet.
        </div>


        <div
          v-else
          class="seasonal-performance-crop-list"
        >

          <article
            v-for="item in performance.crops"
            :key="item.crop.id"
            class="seasonal-performance-crop-card"
          >

            <div class="seasonal-performance-crop-header">

              <div>
                <h3>
                  {{ item.crop.name }}
                </h3>

                <p>
                  {{ item.crop.cropType }}

                  <span v-if="item.crop.variety">
                    · {{ item.crop.variety }}
                  </span>
                </p>
              </div>

              <span class="seasonal-performance-season">
                {{ item.crop.season || 'Season not specified' }}
              </span>

            </div>


            <!-- Crop stats -->

            <div class="seasonal-performance-stats">

              <div>
                <span>Production</span>

                <strong>
                  {{ formatNumber(item.production.totalQuantity) }}
                  {{ item.production.unit }}
                </strong>
              </div>


              <div>
                <span>Yield / Acre</span>

                <strong>
                  {{ formatNumber(item.production.yieldPerAcre) }}
                  {{ item.production.unit }}/acre
                </strong>
              </div>


              <div>
                <span>Expenses</span>

                <strong>
                  {{ formatExpense(item.expenses.total) }}
                </strong>
              </div>


              <div>
                <span>Cycle</span>

                <strong>
                  {{ item.farmingCycle.cycleDays }}
                  days
                </strong>
              </div>

            </div>


            <!-- Resource usage -->

            <div class="seasonal-performance-resources">

              <div>
                <span>Fertilizer</span>

                <strong>
                  {{ formatNumber(item.fertilizer.totalAmount) }}
                  {{ item.fertilizer.unit }}
                </strong>

                <small>
                  {{ item.fertilizer.applicationCount }}
                  applications
                </small>
              </div>


              <div>
                <span>Pesticide</span>

                <strong>
                  {{ formatNumber(item.pesticide.totalAmount) }}
                  {{ item.pesticide.unit }}
                </strong>

                <small>
                  {{ item.pesticide.applicationCount }}
                  applications
                </small>
              </div>


              <div>
                <span>Expense Records</span>

                <strong>
                  {{ item.expenses.recordCount }}
                </strong>

                <small>
                  recorded expenses
                </small>
              </div>

            </div>


            <!-- Farming cycle -->

            <div class="seasonal-performance-cycle">

              <div>
                <span>Planted</span>

                <strong>
                  {{ formatDate(item.farmingCycle.plantingDate) }}
                </strong>
              </div>

              <div>
                <span>Harvest</span>

                <strong>
                  {{ formatDate(item.farmingCycle.harvestDate) }}
                </strong>
              </div>

            </div>


            <button
              type="button"
              class="btn-pill-outline seasonal-performance-details-button"
              @click="loadCropPerformance(item)"
            >
              View Detailed Performance
            </button>

          </article>

        </div>

      </section>

    </template>


    <!-- Crop detail modal -->

    <div
      v-if="selectedCrop"
      class="seasonal-performance-overlay"
      @click.self="closeCropDetails"
    >

      <div class="seasonal-performance-modal">

        <div class="seasonal-performance-modal-header">

          <div>
            <h2>
              {{ selectedCrop.crop.name }}
            </h2>

            <p>
              Detailed crop performance
            </p>
          </div>

          <button
            type="button"
            class="btn-pill-outline"
            @click="closeCropDetails"
          >
            Close
          </button>

        </div>


        <div
          v-if="loadingCrop"
          class="seasonal-performance-loading"
        >
          Loading crop performance...
        </div>


        <div
          v-else-if="cropPerformance"
          class="seasonal-performance-detail-content"
        >

          <div class="seasonal-performance-detail-grid">

            <div>
              <span>Crop</span>

              <strong>
                {{ cropPerformance.crop.name }}
              </strong>
            </div>

            <div>
              <span>Crop Type</span>

              <strong>
                {{ cropPerformance.crop.cropType }}
              </strong>
            </div>

            <div>
              <span>Season</span>

              <strong>
                {{ cropPerformance.crop.season || 'Not specified' }}
              </strong>
            </div>

            <div>
              <span>Area</span>

              <strong>
                {{ cropPerformance.crop.area }}
                {{ cropPerformance.crop.areaUnit }}
              </strong>
            </div>

            <div>
              <span>Production</span>

              <strong>
                {{ formatNumber(cropPerformance.production.totalQuantity) }}
                {{ cropPerformance.production.unit }}
              </strong>
            </div>

            <div>
              <span>Yield Per Acre</span>

              <strong>
                {{ formatNumber(cropPerformance.production.yieldPerAcre) }}
                {{ cropPerformance.production.unit }}/acre
              </strong>
            </div>

            <div>
              <span>Fertilizer</span>

              <strong>
                {{ formatNumber(cropPerformance.fertilizer.totalAmount) }}
                {{ cropPerformance.fertilizer.unit }}
              </strong>
            </div>

            <div>
              <span>Pesticide</span>

              <strong>
                {{ formatNumber(cropPerformance.pesticide.totalAmount) }}
                {{ cropPerformance.pesticide.unit }}
              </strong>
            </div>

            <div>
              <span>Total Expenses</span>

              <strong>
                {{ formatExpense(cropPerformance.expenses.total) }}
              </strong>
            </div>

            <div>
              <span>Expense Records</span>

              <strong>
                {{ cropPerformance.expenses.recordCount }}
              </strong>
            </div>

          </div>


          <!-- Expense breakdown -->

          <div
            v-if="
              cropPerformance.expenses.byCategory &&
              Object.keys(cropPerformance.expenses.byCategory).length
            "
            class="seasonal-performance-expense-breakdown"
          >

            <h3>
              Expense Breakdown
            </h3>

            <div
              v-for="(amount, category) in cropPerformance.expenses.byCategory"
              :key="category"
              class="seasonal-performance-expense-row"
            >
              <span>
                {{ category }}
              </span>

              <strong>
                {{ formatExpense(amount) }}
              </strong>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>
