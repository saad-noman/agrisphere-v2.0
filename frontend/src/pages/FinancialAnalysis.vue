<template>
  <div class="financial-container">

    <!-- Header -->
    <div class="financial-page-header">
      <h1>Financial Analysis</h1>
      <p>
        Review production, expenses, revenue, and profitability
        for your crops.
      </p>
    </div>

    <!-- Crop selector -->
    <section class="financial-card financial-selector-card">
      <div class="financial-selector">
        <label for="crop">
          Select Crop
        </label>

        <select
          id="crop"
          v-model="selectedCropId"
          class="form-select"
          @change="loadAnalysis"
          :disabled="loadingCrops"
        >
          <option value="">
            Select a crop
          </option>

          <option
            v-for="crop in crops"
            :key="crop._id"
            :value="crop._id"
          >
            {{ crop.name }} — {{ crop.cropType }}
          </option>
        </select>
      </div>
    </section>

    <!-- Errors -->
    <div
      v-if="cropError"
      class="financial-message financial-error"
    >
      {{ cropError }}
    </div>

    <div
      v-if="analysisError"
      class="financial-message financial-error"
    >
      {{ analysisError }}
    </div>

    <!-- Loading -->
    <div
      v-if="loadingAnalysis"
      class="financial-loading"
    >
      Loading financial analysis...
    </div>

    <!-- Analysis -->
    <template v-if="analysis && !loadingAnalysis">

      <!-- Summary cards -->
      <div class="financial-summary-grid">

        <div class="financial-card financial-summary-card">
          <span class="financial-summary-label">
            Total Revenue
          </span>

          <span class="financial-summary-value">
            {{ formatMoney(analysis.financial.revenue) }}
          </span>

          <span class="financial-summary-subtext">
            Estimated market revenue
          </span>
        </div>

        <div class="financial-card financial-summary-card">
          <span class="financial-summary-label">
            Total Cost
          </span>

          <span class="financial-summary-value">
            {{ formatMoney(analysis.financial.totalCost) }}
          </span>

          <span class="financial-summary-subtext">
            {{ analysis.costs.expenseCount }} expense record(s)
          </span>
        </div>

        <div class="financial-card financial-summary-card">
          <span class="financial-summary-label">
            Profit
          </span>

          <span class="financial-summary-value">
            {{ formatMoney(analysis.financial.profit) }}
          </span>

          <span class="financial-summary-subtext">
            Revenue minus total cost
          </span>
        </div>

        <div class="financial-card financial-summary-card">
          <span class="financial-summary-label">
            Profit Margin
          </span>

          <span class="financial-summary-value">
            {{ formatPercentage(analysis.financial.profitMargin) }}
          </span>

          <span class="financial-summary-subtext">
            Profit as a percentage of revenue
          </span>
        </div>

      </div>

      <!-- Main analysis -->
      <div class="financial-analysis-grid">

        <!-- Cost breakdown -->
        <section class="financial-card">

          <div class="financial-card-header">
            <h2>Cost Summary</h2>
            <p>
              Breakdown of expenses for this crop.
            </p>
          </div>

          <div
            v-if="Object.keys(analysis.costs.byCategory || {}).length"
            class="financial-cost-list"
          >

            <div
              v-for="(amount, category) in analysis.costs.byCategory"
              :key="category"
              class="financial-cost-row"
            >
              <span class="financial-cost-category">
                {{ category }}
              </span>

              <span class="financial-cost-amount">
                {{ formatMoney(amount) }}
              </span>
            </div>

            <div class="financial-total-row">
              <span>Total</span>

              <span>
                {{ formatMoney(analysis.costs.total) }}
              </span>
            </div>

          </div>

          <div
            v-else
            class="financial-empty"
          >
            No expenses recorded for this crop.
          </div>

        </section>

        <!-- Financial result -->
        <section class="financial-card">

          <div class="financial-card-header">
            <h2>Financial Result</h2>
            <p>
              Current profitability calculation.
            </p>
          </div>

          <div class="financial-result">

            <div class="financial-result-row">
              <span class="financial-result-label">
                Production
              </span>

              <span class="financial-result-value">
                {{ analysis.production.totalQuantity }}
                {{ analysis.production.unit }}
              </span>
            </div>

            <div class="financial-result-row">
              <span class="financial-result-label">
                Revenue
              </span>

              <span class="financial-result-value">
                {{ formatMoney(analysis.financial.revenue) }}
              </span>
            </div>

            <div class="financial-result-row">
              <span class="financial-result-label">
                Total Cost
              </span>

              <span class="financial-result-value">
                {{ formatMoney(analysis.financial.totalCost) }}
              </span>
            </div>

          </div>

          <!-- Profit -->
          <div class="financial-profit-box">
            <span class="financial-profit-label">
              Profit
            </span>

            <span class="financial-profit-value">
              {{ formatMoney(analysis.financial.profit) }}
            </span>
          </div>

          <!-- Margin -->
          <div class="financial-margin-box">
            <span class="financial-margin-label">
              Profit Margin
            </span>

            <span class="financial-margin-value">
              {{ formatPercentage(analysis.financial.profitMargin) }}
            </span>
          </div>

        </section>

      </div>

      <!-- Crop information -->
      <section class="financial-card">

        <div class="financial-card-header">
          <h2>Crop Information</h2>
          <p>
            Details used for this financial analysis.
          </p>
        </div>

        <div class="financial-result">

          <div class="financial-result-row">
            <span class="financial-result-label">
              Crop
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.name }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Crop Type
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.cropType }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Variety
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.variety || '—' }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Area
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.area }}
              {{ analysis.crop.areaUnit }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Season
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.season || '—' }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Status
            </span>

            <span class="financial-result-value">
              {{ analysis.crop.status }}
            </span>
          </div>

        </div>

      </section>

      <!-- Market information -->
      <section class="financial-card">

        <div class="financial-card-header">
          <h2>Market Information</h2>
          <p>
            External market pricing used for revenue estimation.
          </p>
        </div>

        <div class="financial-result">

          <div class="financial-result-row">
            <span class="financial-result-label">
              Market Price
            </span>

            <span class="financial-result-value">
              {{
                analysis.market?.price !== null &&
                analysis.market?.price !== undefined
                  ? formatMoney(analysis.market.price)
                  : 'Unavailable'
              }}
            </span>
          </div>

          <div class="financial-result-row">
            <span class="financial-result-label">
              Symbol
            </span>

            <span class="financial-result-value">
              {{ analysis.market?.symbol || 'Unavailable' }}
            </span>
          </div>

        </div>

      </section>

      <!-- API note -->
      <div
        v-if="analysis.note"
        class="financial-note"
      >
        {{ analysis.note }}
      </div>

    </template>

    <!-- Nothing selected -->
    <div
      v-if="!selectedCropId && !loadingCrops"
      class="financial-card financial-empty"
    >
      Select a crop above to view its financial analysis.
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = 'http://localhost:5000/api'

const crops = ref([])
const selectedCropId = ref('')

const analysis = ref(null)

const loadingCrops = ref(false)
const loadingAnalysis = ref(false)

const cropError = ref('')
const analysisError = ref('')

function getToken() {
  return localStorage.getItem('token')
}

async function loadCrops() {
  loadingCrops.value = true
  cropError.value = ''

  try {
    const response = await fetch(`${API_BASE}/crops`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load crops.'
      )
    }

    crops.value = data
  } catch (error) {
    cropError.value = error.message
  } finally {
    loadingCrops.value = false
  }
}

async function loadAnalysis() {
  analysis.value = null
  analysisError.value = ''

  if (!selectedCropId.value) {
    return
  }

  loadingAnalysis.value = true

  try {
    const response = await fetch(
      `${API_BASE}/expenses/analysis/${selectedCropId.value}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to load financial analysis.'
      )
    }

    analysis.value = data
  } catch (error) {
    analysisError.value = error.message
  } finally {
    loadingAnalysis.value = false
  }
}

function formatMoney(value) {
  if (value === null || value === undefined) {
    return 'Unavailable'
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return 'Unavailable'
  }

  const currency =
    analysis.value?.financial?.currency || 'USD'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(number)
}

function formatPercentage(value) {
  if (value === null || value === undefined) {
    return 'Unavailable'
  }

  const number = Number(value)

  if (Number.isNaN(number)) {
    return 'Unavailable'
  }

  return `${number.toFixed(2)}%`
}

onMounted(() => {
  loadCrops()
})
</script>


