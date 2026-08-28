<template>
  <div>

    <h3 class="mb-4">Production Records</h3>

    <div class="card mb-4">
      <div class="card-body">

        <form @submit.prevent="saveRecord">

          <div class="row g-3">

            <div class="col-md-3">
              <label class="form-label">Quantity</label>
              <input
                v-model.number="form.quantity"
                type="number"
                class="form-control"
                required
              >
            </div>

            <div class="col-md-2">
              <label class="form-label">Unit</label>

              <select
                v-model="form.unit"
                class="form-select"
              >
                <option>kg</option>
                <option>ton</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">Harvest Date</label>

              <input
                type="date"
                v-model="form.harvestDate"
                class="form-control"
              >
            </div>

            <div class="col-md-4">
              <label class="form-label">Quality</label>

              <input
                v-model="form.quality"
                class="form-control"
              >
            </div>

            <div class="col-12">

              <label class="form-label">Notes</label>

              <textarea
                v-model="form.notes"
                class="form-control"
              ></textarea>

            </div>

          </div>

          <button
            class="btn-pill mt-3"
          >
            {{ editing ? 'Update Record' : 'Add Record' }}
          </button>

          <button
            v-if="editing"
            class="btn-pill-outline mt-3 ms-2"
            type="button"
            @click="resetForm"
          >
            Cancel
          </button>

        </form>

      </div>
    </div>

    <div
      v-for="record in records"
      :key="record._id"
      class="card mb-3"
    >
      <div class="card-body">

        <div class="d-flex justify-content-between">

          <div>

            <h5>
              {{ record.quantity }}
              {{ record.unit }}
            </h5>

            <p class="mb-1">
              {{ record.quality }}
            </p>

            <p class="mb-1">
              {{ formatDate(record.harvestDate) }}
            </p>

            <small class="text-muted">
              {{ record.notes }}
            </small>

          </div>

          <div>

            <button
              class="btn-pill-outline me-2"
              @click="editRecord(record)"
            >
              Edit
            </button>

            <button
              class="btn-pill-danger btn-pill-sm"
              @click="deleteRecord(record._id)"
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
const props = defineProps({
  cropId: String,
});

const API = 'http://localhost:5000/api';

const auth = {
  headers: {
    Authorization:
      `Bearer ${localStorage.getItem('token')}`,
  },
};

const records = ref([]);

const editing = ref(false);

const editingId = ref(null);

const form = ref({
  quantity: '',
  unit: 'kg',
  harvestDate: '',
  quality: '',
  notes: '',
});

async function loadRecords() {
  const res = await axios.get(
    `${API}/crops/${props.cropId}/production`,
    auth
  );

  records.value = res.data;
}

async function saveRecord() {

  if (editing.value) {

    await axios.put(
      `${API}/production/${editingId.value}`,
      form.value,
      auth
    );

  } else {

    await axios.post(
      `${API}/crops/${props.cropId}/production`,
      form.value,
      auth
    );

  }

  resetForm();

  loadRecords();
}

function editRecord(record) {

  editing.value = true;

  editingId.value = record._id;

  form.value = {
    quantity: record.quantity,
    unit: record.unit,
    harvestDate: record.harvestDate.slice(0,10),
    quality: record.quality,
    notes: record.notes,
  };

}

async function deleteRecord(id) {

  if (!(await confirmDelete('Are you sure you want to delete this production record?'))) return;

  await axios.delete(
    `${API}/production/${id}`,
    auth
  );

  loadRecords();

}

function resetForm() {

  editing.value = false;

  editingId.value = null;

  form.value = {
    quantity: '',
    unit: 'kg',
    harvestDate: '',
    quality: '',
    notes: '',
  };

}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

onMounted(loadRecords);

</script>
