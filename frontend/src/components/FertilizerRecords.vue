<template>
  <div>

    <h3 class="mb-4">Fertilizer Records</h3>

    <div class="card mb-4">
      <div class="card-body">

        <form @submit.prevent="saveRecord">

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Fertilizer</label>

              <select
                v-model="form.fertilizer"
                class="form-select"
                required
              >
                <option value="">Select Fertilizer</option>

                <option
                  v-for="item in fertilizers"
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
                placeholder="kg"
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
            type="button"
            class="btn-pill-outline mt-3 ms-2"
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
              {{ fertilizerName(record.fertilizer) }}
            </h5>

            <p class="mb-1">
              {{ record.quantity }} {{ record.unit }}
            </p>

            <p class="mb-1">
              {{ formatDate(record.applicationDate) }}
            </p>

            <small>{{ record.notes }}</small>

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

const fertilizers = ref([]);
const records = ref([]);

const editing = ref(false);
const editingId = ref(null);

const form = ref({
  fertilizer: '',
  quantity: '',
  unit: 'kg',
  applicationDate: '',
  notes: '',
});

async function loadCatalog() {
  const res = await axios.get(
    `${API}/fertilizers`,
    auth
  );

  fertilizers.value = res.data;
}

async function loadRecords() {
  const res = await axios.get(
    `${API}/crops/${props.cropId}/fertilizers`,
    auth
  );

  records.value = res.data;
}

async function saveRecord() {

  if (editing.value) {

    await axios.put(
      `${API}/fertilizer-records/${editingId.value}`,
      form.value,
      auth
    );

  } else {

    await axios.post(
      `${API}/crops/${props.cropId}/fertilizers`,
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
    fertilizer:
      typeof record.fertilizer === 'object'
        ? record.fertilizer._id
        : record.fertilizer,

    quantity: record.quantity,
    unit: record.unit,
    applicationDate: record.applicationDate?.slice(0, 10),
    notes: record.notes,
  };

}

async function deleteRecord(id) {

  if (!(await confirmDelete('Are you sure you want to delete this fertilizer record?'))) return;

  await axios.delete(
    `${API}/fertilizer-records/${id}`,
    auth
  );

  loadRecords();
}

function fertilizerName(fertilizer) {

  const id =
    typeof fertilizer === 'object'
      ? fertilizer._id
      : fertilizer;

  const item = fertilizers.value.find(
    f => f._id === id
  );

  return item?.name ?? 'Unknown';

}

function resetForm() {

  editing.value = false;

  editingId.value = null;

  form.value = {
    fertilizer: '',
    quantity: '',
    unit: 'kg',
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
