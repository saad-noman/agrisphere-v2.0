<template>
  <div class="financial-container">

    <!-- Header -->
    <div class="financial-page-header">
      <h1>Expense Management</h1>
      <p>
        Record and review expenses associated with your crops.
      </p>
    </div>

    <!-- Messages -->
    <div
      v-if="successMessage"
      class="financial-message"
    >
      {{ successMessage }}
    </div>

    <div
      v-if="errorMessage"
      class="financial-message financial-error"
    >
      {{ errorMessage }}
    </div>

    <!-- Add Expense -->
    <section class="financial-card financial-selector-card">

      <div class="financial-card-header">
        <h2>Add Expense</h2>
        <p>
          Record a new expense for one of your crops.
        </p>
      </div>

      <form @submit.prevent="createExpense">

        <!-- Crop -->
        <div class="mb-3">
          <label
            for="expenseCrop"
            class="form-label"
          >
            Crop
          </label>

          <select
            id="expenseCrop"
            v-model="form.cropId"
            class="form-select"
            :disabled="submitting || loadingCrops"
            required
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

        <!-- Category -->
        <div class="mb-3">
          <label
            for="expenseCategory"
            class="form-label"
          >
            Category
          </label>

          <select
            id="expenseCategory"
            v-model="form.category"
            class="form-select"
            :disabled="submitting"
            required
          >
            <option value="">
              Select category
            </option>

            <option value="Fertilizer">
              Fertilizer
            </option>

            <option value="Pesticide">
              Pesticide
            </option>

            <option value="Seeds">
              Seeds
            </option>

            <option value="Labor">
              Labor
            </option>

            <option value="Irrigation">
              Irrigation
            </option>

            <option value="Equipment">
              Equipment
            </option>

            <option value="Transport">
              Transport
            </option>

            <option value="Other">
              Other
            </option>
          </select>
        </div>

        <!-- Amount -->
        <div class="mb-3">
          <label
            for="expenseAmount"
            class="form-label"
          >
            Amount
          </label>

          <input
            id="expenseAmount"
            v-model.number="form.amount"
            type="number"
            min="0"
            step="0.01"
            class="form-control"
            placeholder="e.g. 5000"
            :disabled="submitting"
            required
          />
        </div>

        <!-- Date -->
        <div class="mb-4">
          <label
            for="expenseDate"
            class="form-label"
          >
            Date
          </label>

          <input
            id="expenseDate"
            v-model="form.date"
            type="date"
            class="form-control"
            :disabled="submitting"
            required
          />
        </div>

        <button
          type="submit"
          class="btn-pill"
          :disabled="submitting || !crops.length"
        >
          {{ submitting ? 'Saving...' : 'Add Expense' }}
        </button>

      </form>

    </section>

    <!-- Expense List -->
    <section class="financial-card">

      <div class="financial-card-header">
        <h2>Expense History</h2>
        <p>
          Your recorded expenses.
        </p>
      </div>

      <!-- Loading -->
      <div
        v-if="loadingExpenses"
        class="financial-loading"
      >
        Loading expenses...
      </div>

      <!-- Empty -->
      <div
        v-else-if="expenses.length === 0"
        class="financial-empty"
      >
        No expenses have been recorded yet.
      </div>

      <!-- Expense list -->
      <div
        v-else
        class="financial-cost-list"
      >

        <div
          v-for="expense in expenses"
          :key="expense._id"
          class="financial-cost-row"
        >

          <div>
            <div class="financial-cost-category">
              {{ expense.category }}
            </div>

            <div class="financial-summary-subtext">
              {{ getCropName(expense.crop) }}
              ·
              {{ formatDate(expense.date) }}
            </div>
          </div>

          <span class="financial-cost-amount">
            {{ formatMoney(expense.amount) }}
          </span>

        </div>

      </div>

    </section>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = 'http://localhost:5000/api'

const crops = ref([])
const expenses = ref([])

const loadingCrops = ref(false)
const loadingExpenses = ref(false)
const submitting = ref(false)

const successMessage = ref('')
const errorMessage = ref('')

const form = ref({
  cropId: '',
  category: '',
  amount: '',
  date: ''
})

function getToken() {
  return localStorage.getItem('token')
}

async function loadCrops() {
  loadingCrops.value = true

  try {
    const response = await fetch(
      `${API_BASE}/crops`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load crops.'
      )
    }

    crops.value = data
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingCrops.value = false
  }
}

async function loadExpenses() {
  loadingExpenses.value = true

  try {
    const response = await fetch(
      `${API_BASE}/expenses`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to load expenses.'
      )
    }

    expenses.value = data
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loadingExpenses.value = false
  }
}

async function createExpense() {
  successMessage.value = ''
  errorMessage.value = ''
  submitting.value = true

  try {
    const response = await fetch(
      `${API_BASE}/expenses`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          cropId: form.value.cropId,
          category: form.value.category,
          amount: Number(form.value.amount),
          date: form.value.date
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Failed to create expense.'
      )
    }

    successMessage.value =
      'Expense recorded successfully.'

    resetForm()

    await loadExpenses()

  } catch (error) {
    errorMessage.value = error.message
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.value = {
    cropId: '',
    category: '',
    amount: '',
    date: ''
  }
}

function getCropName(crop) {
  if (!crop) {
    return 'Unknown crop'
  }

  // API may return either the crop ID or the populated crop object
  const cropId =
    typeof crop === 'object'
      ? crop._id
      : crop

  const matchedCrop = crops.value.find(
    item => String(item._id) === String(cropId)
  )

  if (matchedCrop) {
    return `${matchedCrop.name} (${matchedCrop.cropType})`
  }

  // If the API already populated the crop object,
  // use its information directly.
  if (typeof crop === 'object' && crop.name) {
    return `${crop.name}${crop.cropType ? ` (${crop.cropType})` : ''}`
  }

  return 'Unknown crop'
}

function formatMoney(value) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return 'Unavailable'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(number)
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

onMounted(async () => {
  await loadCrops()
  await loadExpenses()
})
</script>
