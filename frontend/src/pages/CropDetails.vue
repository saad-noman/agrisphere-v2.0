<template>
  <div class="container py-4" v-if="crop">

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2>{{ crop.name }}</h2>

        <p class="text-muted mb-0">
          {{ crop.cropType }} • {{ crop.variety }}
        </p>
      </div>

      <router-link
        to="/farm-records"
        class="btn-pill-outline"
      >
        Back
      </router-link>
    </div>

    <div class="card mb-4">
      <div class="card-body">

        <div class="row">

          <div class="col-md-4">
            <strong>Season</strong>
            <p>{{ crop.season }}</p>
          </div>

          <div class="col-md-4">
            <strong>Area</strong>
            <p>{{ crop.area }} {{ crop.areaUnit }}</p>
          </div>

          <div class="col-md-4">
            <strong>Status</strong>
            <p>{{ crop.status }}</p>
          </div>

          <div class="col-md-6">
            <strong>Planting Date</strong>
            <p>{{ formatDate(crop.plantingDate) }}</p>
          </div>

          <div class="col-md-6">
            <strong>Expected Harvest</strong>
            <p>{{ formatDate(crop.expectedHarvestDate) }}</p>
          </div>

          <div class="col-md-6">
            <strong>Location</strong>
            <p>{{ crop.location }}</p>
          </div>

          <div class="col-md-6">
            <strong>Notes</strong>
            <p>{{ crop.notes }}</p>
          </div>

        </div>

      </div>
    </div>

    <div class="row">

      <div class="col-md-4">
        <div class="card h-100">

          <div class="card-body text-center">

            <h5>Production</h5>

            <p class="text-muted">
              Harvest records and yields
            </p>

            <button
              class="btn-pill"
              @click="activeTab='production'"
            >
              Manage
            </button>

          </div>

        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100">

          <div class="card-body text-center">

            <h5>Fertilizers</h5>

            <p class="text-muted">
              Fertilizer applications
            </p>

            <button
              class="btn-pill"
              @click="activeTab='fertilizer'"
            >
              Manage
            </button>

          </div>

        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100">

          <div class="card-body text-center">

            <h5>Pesticides</h5>

            <p class="text-muted">
              Pesticide applications
            </p>

            <button
              class="btn-pill"
              @click="activeTab='pesticide'"
            >
              Manage
            </button>

          </div>

        </div>
      </div>

    </div>

    <div class="mt-5">

      <div v-if="activeTab==='production'">
        <ProductionRecords :crop-id="id" />
      </div>

      <div v-if="activeTab==='fertilizer'">
        <FertilizerRecords :crop-id="id" />
      </div>

      <div v-if="activeTab==='pesticide'">
        <PesticideRecords :crop-id="id" />
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

import ProductionRecords from '../components/ProductionRecords.vue';
import FertilizerRecords from '../components/FertilizerRecords.vue';
import PesticideRecords from '../components/PesticideRecords.vue';

const API = 'http://localhost:5000/api';

const route = useRoute();

const id = route.params.id;

const token = localStorage.getItem('token');

const auth = {
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const crop = ref(null);

const activeTab = ref('production');

async function loadCrop() {
  const res = await axios.get(
    `${API}/crops/${id}`,
    auth
  );

  crop.value = res.data;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

onMounted(loadCrop);
</script>
