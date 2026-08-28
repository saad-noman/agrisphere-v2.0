<template>
  <div>

    <h3 class="mb-4">Pesticide Records</h3>

    <div class="card mb-4">
      <div class="card-body">

        <form @submit.prevent="saveRecord">

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Pesticide</label>

              <select
                v-model="form.pesticide"
                class="form-select"
                required
              >
                <option value="">Select Pesticide</option>

                <option
                  v-for="item in pesticides"
                  :key="item._id"
                  :value="item._id"
                >
                  {{ item.name }}
                </option>

              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">Quantity</label>

              <input
                v-model.number="form.quantity"
                type="number"
                class="form-control"
              >
            </div>

            <div class="col-md-3">
              <label class="form-label">Unit</label>

              <input
                v-model="form.unit"
                class="form-control"
                placeholder="L"
              >
            </div>

            <div class="col-md-6">
              <label class="form-label">Application Date</label>

              <input
                type="date"
                v-model="form.applicationDate"
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
      class="card mb-3"
      v-for="record in records"
      :key="record._id"
    >
      <div class="card-body">

        <div class="d-flex justify-content-between">

          <div>

            <h5>
              {{ pesticideName(record.pesticide) }}
            </h5>

            <p class="mb-1">
              {{ record.quantity }}
              {{ record.unit }}
            </p>

            <p class="mb-1">
              {{ formatDate(record.applicationDate) }}
            </p>

            <small>
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
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
};

const pesticides = ref([]);
const records = ref([]);

const editing = ref(false);
const editingId = ref(null);

const form = ref({
  pesticide: '',
  quantity: '',
  unit: 'L',
  applicationDate: '',
  notes: '',
});

async function loadCatalog() {

  const res = await axios.get(
    `${API}/pesticides`,
    auth
  );

  pesticides.value = res.data;

}

async function loadRecords() {

  const res = await axios.get(
    `${API}/crops/${props.cropId}/pesticides`,
    auth
  );

  records.value = res.data;

}

async function saveRecord() {

  if (editing.value) {

    await axios.put(
      `${API}/pesticide-records/${editingId.value}`,
      form.value,
      auth
    );

  } else {

    await axios.post(
      `${API}/crops/${props.cropId}/pesticides`,
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
    pesticide:
      typeof record.pesticide === 'object'
        ? record.pesticide._id
        : record.pesticide,

    quantity: record.quantity,
    unit: record.unit,
    applicationDate: record.applicationDate?.slice(0, 10),
    notes: record.notes,
  };

}

async function deleteRecord(id) {

  if (!(await confirmDelete('Are you sure you want to delete this pesticide record?'))) return;

  await axios.delete(
    `${API}/pesticide-records/${id}`,
    auth
  );

  loadRecords();

}

function pesticideName(pesticide) {

  const id =
    typeof pesticide === 'object'
      ? pesticide._id
      : pesticide;

  const item = pesticides.value.find(
    p => p._id === id
  );

  return item?.name ?? 'Unknown';

}

function resetForm() {

  editing.value = false;

  editingId.value = null;

  form.value = {
    pesticide: '',
    quantity: '',
    unit: 'L',
    applicationDate: '',
    notes: '',
  };

}

function formatDate(date) {

  return date
    ? new Date(date).toLocaleDateString()
    : '';

}

onMounted(async () => {

  await loadCatalog();

  await loadRecords();

});
</script>
