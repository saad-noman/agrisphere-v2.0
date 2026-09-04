<template>
  <div class="container py-4">
    <h2 class="mb-4">My Fields</h2>

    <div class="card mb-4">
      <div class="card-body">
        <h5>Add Field</h5>

        <form @submit.prevent="createCrop">

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Field Name</label>
              <input
                v-model="form.name"
                class="form-control"
                required
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Crop Type</label>
              <input
                v-model="form.cropType"
                class="form-control"
                placeholder="Rice"
                required
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Variety</label>
              <input
                v-model="form.variety"
                class="form-control"
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Season</label>
              <input
                v-model="form.season"
                class="form-control"
                placeholder="Kharif"
              >
            </div>

            <div class="col-md-3">
              <label class="form-label">Area</label>
              <input
                v-model.number="form.area"
                type="number"
                class="form-control"
              >
            </div>

            <div class="col-md-3">
              <label class="form-label">Unit</label>
              <select
                v-model="form.areaUnit"
                class="form-select"
              >
                <option>acre</option>
                <option>hectare</option>
              </select>
            </div>

            <div class="col-12">
              <FieldBoundaryMap
                :boundary="form.geoBoundary"
                :area-unit="form.areaUnit"
                @update:boundary="form.geoBoundary = $event"
                @update:area="form.area = $event"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label">Planting Date</label>
              <input
                type="date"
                v-model="form.plantingDate"
                class="form-control"
              >
            </div>

            <div class="col-md-3">
              <label class="form-label">Expected Harvest</label>
              <input
                type="date"
                v-model="form.expectedHarvestDate"
                class="form-control"
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Location</label>
              <input
                v-model="form.location"
                class="form-control"
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Notes</label>
              <input
                v-model="form.notes"
                class="form-control"
              >
            </div>

          </div>

          <button class="btn-pill mt-3">
            Add Field
          </button>

        </form>
      </div>
    </div>

    <div
      v-for="crop in crops"
      :key="crop._id"
      class="card mb-3"
    >
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-start">

          <div>
            <h5>{{ crop.name }}</h5>

            <p class="mb-1">
              {{ crop.cropType }} • {{ crop.variety }}
            </p>

            <p class="mb-1">
              {{ crop.area }} {{ crop.areaUnit }}
            </p>

            <p class="text-muted mb-2">
              {{ crop.location }}
            </p>
          </div>

          <div>

            <router-link
              :to="`/farm-records/${crop._id}`"
              class="btn-pill me-2"
            >
              Open
            </router-link>

            <button
              class="btn-pill-danger btn-pill-sm"

              @click="deleteCrop(crop._id)"
            >
              Delete
            </button>

          </div>

        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

import { confirmDelete } from '../stores/confirm';
import FieldBoundaryMap from '../components/FieldBoundaryMap.vue';
const API = 'http://localhost:5000/api';

const token = localStorage.getItem('token');

const auth = {
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const crops = ref([]);

const form = ref({
  name: '',
  cropType: '',
  variety: '',
  season: '',
  area: '',
  areaUnit: 'acre',
  plantingDate: '',
  expectedHarvestDate: '',
  location: '',
  notes: '',
  geoBoundary: null,
});

async function loadCrops() {
  const res = await axios.get(`${API}/crops`, auth);
  crops.value = res.data;
}

async function createCrop() {
  await axios.post(
    `${API}/crops`,
    form.value,
    auth
  );

  form.value = {
    name: '',
    cropType: '',
    variety: '',
    season: '',
    area: '',
    areaUnit: 'acre',
    plantingDate: '',
    expectedHarvestDate: '',
    location: '',
    notes: '',
    geoBoundary: null,
  };

  loadCrops();
}

async function deleteCrop(id) {
  if (!(await confirmDelete('Are you sure you want to delete this crop?'))) return;

  await axios.delete(
    `${API}/crops/${id}`,
    auth
  );

  loadCrops();
}

onMounted(loadCrops);
</script>
