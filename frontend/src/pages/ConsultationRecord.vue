<template>
  <div class="consultation-record container py-4">
    <h2 class="mb-4">Consultation Record</h2>

    <p v-if="appointments.length === 0" class="empty-state">No consultations yet.</p>
    <ul class="list-group">
      <li v-for="appointment in appointments" :key="appointment._id" class="list-group-item">
        <div class="fw-bold">{{ appointment.title }}</div>
        <div class="text-muted small">Farmer: {{ appointment.farmerId?.name }}</div>
        <div class="small">Mode: {{ appointment.consultationType }}</div>
        <div class="small">{{ formatDateOnly(appointment.date) }} {{ appointment.time }}</div>
        <span class="status-badge" :class="statusBadgeClass(appointment.status)">{{ appointment.status }}</span>

        <div v-if="appointment.record" class="mt-2">
          <div v-if="appointment.record.diagnosis"><strong>Diagnosis:</strong> {{ appointment.record.diagnosis }}</div>
          <div v-if="appointment.record.recommendations">
            <strong>Recommendations:</strong> {{ appointment.record.recommendations }}
          </div>
          <div v-if="appointment.record.notes"><strong>Notes:</strong> {{ appointment.record.notes }}</div>
        </div>

        <div v-if="appointment.status === 'scheduled'" class="mt-2">
          <button v-if="openId !== appointment._id" type="button" class="btn-pill-outline" @click="openId = appointment._id">
            Mark Completed / Add Notes
          </button>
          <div v-else>
            <div class="mb-2">
              <label class="form-label">Diagnosis</label>
              <textarea v-model="recordForm.diagnosis" class="form-control"></textarea>
            </div>
            <div class="mb-2">
              <label class="form-label">Recommendations</label>
              <textarea v-model="recordForm.recommendations" class="form-control"></textarea>
            </div>
            <div class="mb-2">
              <label class="form-label">Notes</label>
              <textarea v-model="recordForm.notes" class="form-control"></textarea>
            </div>
            <button class="btn-pill" :disabled="completing" @click="handleComplete(appointment)">
              {{ completing ? 'Saving...' : 'Save & Complete' }}
            </button>
            <button type="button" class="btn-pill-secondary ms-2" @click="openId = null">Cancel</button>
            <p v-if="completeError" class="app-alert app-alert-danger">{{ completeError }}</p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getMyAppointments, completeAppointment } from '../services/consultationService';

const appointments = ref([]);
const openId = ref(null);
const recordForm = ref({ diagnosis: '', recommendations: '', notes: '' });
const completing = ref(false);
const completeError = ref('');

onMounted(loadAppointments);

async function loadAppointments() {
  const response = await getMyAppointments();
  appointments.value = response.data;
}

async function handleComplete(appointment) {
  completeError.value = '';
  completing.value = true;

  try {
    await completeAppointment(appointment._id, recordForm.value);
    openId.value = null;
    recordForm.value = { diagnosis: '', recommendations: '', notes: '' };
    await loadAppointments();
  } catch (err) {
    completeError.value = err.response?.data?.message || 'Could not save the record. Please try again.';
  } finally {
    completing.value = false;
  }
}

function formatDateOnly(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'status-success';
  if (status === 'cancelled') return 'status-danger';
  return 'status-neutral';
}
</script>
