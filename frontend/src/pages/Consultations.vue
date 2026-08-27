<template>
  <div class="my-consultations container py-4">
    <h2 class="mb-4">My Consultations</h2>

    <h4 class="mb-3">Requests</h4>
    <p v-if="requests.length === 0" class="empty-state">No consultation requests yet.</p>
    <ul class="list-group mb-4">
      <li v-for="request in requests" :key="request._id" class="list-group-item">
        <div class="fw-bold">{{ request.title }}</div>
        <div class="text-muted small">Expert: {{ request.expertId?.fullName }}</div>
        <div v-if="request.description" class="small">{{ request.description }}</div>
        <div class="small">Mode: {{ request.consultationType }}</div>
        <div v-if="request.preferredDate" class="small">Preferred: {{ formatDate(request.preferredDate) }}</div>
        <span class="status-badge" :class="statusBadgeClass(request.status)">{{ request.status }}</span>

        <div v-if="request.status === 'rescheduled'" class="mt-2">
          <button class="btn-pill-outline" :disabled="accepting" @click="handleAcceptReschedule(request)">
            {{ accepting ? 'Accepting...' : 'Accept New Time' }}
          </button>
        </div>
      </li>
    </ul>
    <p v-if="acceptError" class="app-alert app-alert-danger">{{ acceptError }}</p>

    <h4 class="mb-3">Appointments</h4>
    <p v-if="appointments.length === 0" class="empty-state">No scheduled appointments yet.</p>
    <ul class="list-group">
      <li v-for="appointment in appointments" :key="appointment._id" class="list-group-item">
        <div class="fw-bold">{{ appointment.title }}</div>
        <div class="text-muted small">Expert: {{ appointment.expertId?.fullName }}</div>
        <div class="small">Mode: {{ appointment.consultationType }}</div>
        <div class="small">{{ formatDateOnly(appointment.date) }} {{ appointment.time }}</div>
        <div v-if="appointment.meetingLink" class="small">Meeting: {{ appointment.meetingLink }}</div>
        <div v-if="appointment.location" class="small">Location: {{ appointment.location }}</div>
        <span class="status-badge" :class="statusBadgeClass(appointment.status)">{{ appointment.status }}</span>

        <div v-if="appointment.record" class="mt-2">
          <div v-if="appointment.record.diagnosis"><strong>Diagnosis:</strong> {{ appointment.record.diagnosis }}</div>
          <div v-if="appointment.record.recommendations">
            <strong>Recommendations:</strong> {{ appointment.record.recommendations }}
          </div>
          <div v-if="appointment.record.notes"><strong>Notes:</strong> {{ appointment.record.notes }}</div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getMyRequests, getMyAppointments, acceptReschedule } from '../services/consultationService';

const requests = ref([]);
const appointments = ref([]);
const accepting = ref(false);
const acceptError = ref('');

onMounted(async () => {
  await loadRequests();
  await loadAppointments();
});

async function loadRequests() {
  const response = await getMyRequests();
  // Requests that have been approved already show up as appointments below.
  requests.value = response.data.filter((request) => request.status !== 'approved');
}

async function loadAppointments() {
  const response = await getMyAppointments();
  appointments.value = response.data;
}

async function handleAcceptReschedule(request) {
  acceptError.value = '';
  accepting.value = true;

  try {
    const date = request.preferredDate ? request.preferredDate.substring(0, 10) : '';
    const time = request.preferredDate ? new Date(request.preferredDate).toTimeString().substring(0, 5) : '';

    await acceptReschedule(request._id, { date, time });
    await loadRequests();
    await loadAppointments();
  } catch (err) {
    acceptError.value = err.response?.data?.message || 'Could not accept the new time. Please try again.';
  } finally {
    accepting.value = false;
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '';
}

// Appointment dates have their own separate "time" field, so only the date
// part is shown here to avoid displaying two different times side by side.
function formatDateOnly(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

function statusBadgeClass(status) {
  if (status === 'approved' || status === 'completed') return 'status-success';
  if (status === 'rejected' || status === 'cancelled') return 'status-danger';
  if (status === 'rescheduled') return 'status-warning';
  return 'status-neutral';
}
</script>
