<template>
  <main class="crop-analysis container py-4">
    <div class="ca-header">
      <h2 class="mb-1">AI Crop Disease Analysis</h2>
      <p class="text-muted mb-0">
        Upload a clear photo of a crop leaf to detect a possible disease.
      </p>
    </div>

    <div class="row g-4">
      <!-- Upload column -->
      <div class="col-lg-5">
        <section class="card ca-card">
          <h5 class="mb-3">Detect a crop disease</h5>

          <label class="ca-dropzone" :class="{ 'ca-dropzone-filled': previewUrl }">
            <input type="file" accept="image/*" class="d-none" @change="onFile" />
            <template v-if="previewUrl">
              <img :src="previewUrl" alt="Selected crop" class="ca-preview" />
              <span class="ca-change">Click to change image</span>
            </template>
            <template v-else>
              <div class="ca-drop-inner">
                <div class="ca-drop-icon">📷</div>
                <div>Click to upload an image</div>
                <small class="text-muted">JPG / PNG, up to 5 MB</small>
              </div>
            </template>
          </label>

          <p v-if="error" class="app-alert app-alert-danger mt-3 mb-0">{{ error }}</p>

          <div class="d-flex gap-2 mt-3">
            <button
              type="button"
              class="btn-pill flex-grow-1"
              :disabled="!file || loading"
              @click="analyze"
            >
              <span v-if="loading">Analyzing…</span>
              <span v-else>Detect Disease</span>
            </button>
            <button v-if="file" type="button" class="btn-pill-secondary" :disabled="loading" @click="reset">
              Clear
            </button>
          </div>

          <div v-if="loading" class="ca-processing mt-3">
            <div class="ca-spinner"></div>
            <span>Running the disease-detection model…</span>
          </div>
        </section>
      </div>

      <!-- Result column -->
      <div class="col-lg-7">
        <section v-if="!result" class="card ca-card ca-result-empty">
          <div class="empty-state mb-0">
            Your structured disease report will appear here after analysis.
          </div>
        </section>

        <section v-else class="card ca-card">
          <!-- Prediction header -->
          <div class="ca-pred-head">
            <div>
              <div class="ca-pred-label">{{ result.prediction.label }}</div>
              <div v-if="result.prediction.scientificName" class="ca-sci">
                <em>{{ result.prediction.scientificName }}</em>
              </div>
              <div v-if="result.prediction.crop" class="text-muted small">
                Crop: {{ result.prediction.crop }}
              </div>
            </div>
            <div class="ca-confidence">
              <span
                class="ca-conf-badge"
                :class="confClass(result.prediction)"
              >
                {{ result.prediction.confidencePct != null ? result.prediction.confidencePct + '%' : '—' }} confidence
              </span>
            </div>
          </div>

          <!-- Uncertainty banner -->
          <div v-if="result.prediction.lowConfidence" class="app-alert app-alert-danger ca-uncertain">
            ⚠️ Low confidence — treat this as a rough estimate, not a certain result.
            <span v-if="result.prediction.note">{{ result.prediction.note }}</span>
          </div>

          <!-- Alternatives -->
          <div v-if="result.prediction.alternatives?.length" class="ca-alts">
            <span class="ca-alts-title">Other possibilities:</span>
            <span v-for="(a, i) in result.prediction.alternatives" :key="i" class="ca-alt-chip">
              {{ a.label }} <small v-if="a.confidencePct != null">({{ a.confidencePct }}%)</small>
            </span>
          </div>

          <hr />

          <!-- Structured disease report -->
          <div class="ca-report">
            <ReportRow label="Disease" :value="result.report.diseaseName" />
            <ReportRow label="Affected crop" :value="result.report.affectedCrop" />
            <ReportRow label="Symptoms" :value="result.report.symptoms" />
            <ReportRow label="Cause / pathogen" :value="result.report.cause" />
            <ReportRow label="Transmission / spread" :value="result.report.transmission" />
            <ReportRow label="Favorable conditions" :value="result.report.favorableConditions" />
            <ReportRow label="Prevention" :value="result.report.prevention" />
            <ReportRow label="Cultural management" :value="result.report.culturalManagement" />
            <ReportRow label="Biological control" :value="result.report.biologicalControl" />
            <ReportRow label="Management / treatment" :value="result.report.treatment" />
            <ReportRow v-if="result.report.regionalNotes" label="Regional notes" :value="result.report.regionalNotes" />
            <ReportRow v-if="result.report.sources" label="Sources" :value="result.report.sources" />
          </div>

          <div class="ca-disclaimer">
            {{ result.report.notes ||
              'AI detection is decision support, not a guaranteed professional diagnosis. Confirm with an expert before treating.' }}
          </div>

          <div class="ca-report-meta">
            Report source: {{ result.reportSource === 'llm' ? 'AI-organized from AgriSphere knowledge' : 'AgriSphere knowledge base' }}
            · Model: {{ result.prediction.model }}
          </div>
        </section>
      </div>
    </div>

    <!-- History -->
    <section v-if="history.length" class="mt-4">
      <h5 class="mb-3">Recent detections</h5>
      <p v-if="historyError" class="app-alert app-alert-danger">{{ historyError }}</p>
      <div class="ca-history">
        <div
          v-for="h in history"
          :key="h._id"
          class="ca-history-item card"
          style="cursor: pointer"
          @click="viewHistoryItem(h)"
        >
          <img v-if="h.image" :src="serverUrl + h.image" alt="" class="ca-history-img" />
          <div class="ca-history-body">
            <div class="fw-bold">{{ h.label }}</div>
            <div class="text-muted small">{{ formatDate(h.createdAt) }}</div>
            <div v-if="h.confidence != null" class="small">
              {{ Math.round(h.confidence * 100) }}% · {{ h.modelUsed }}
            </div>
            <div v-if="viewingId === h._id" class="small text-muted">Loading…</div>
          </div>
          <button
            type="button"
            class="btn-pill-danger btn-pill-sm ca-history-delete"
            :disabled="deletingId === h._id"
            @click.stop="handleDelete(h)"
          >
            {{ deletingId === h._id ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, h, onMounted } from 'vue';
import { serverUrl } from '../services/api';
import {
  detectDisease,
  getAnalysisHistory,
  getAnalysisHistoryItem,
  deleteAnalysis,
} from '../services/cropAnalysisService';
import { confirmDelete } from '../stores/confirm';

// Tiny presentational helper for report rows (skips empty values).
const ReportRow = (props) => {
  if (!props.value) return null;
  return h('div', { class: 'ca-row' }, [
    h('div', { class: 'ca-row-label' }, props.label),
    h('div', { class: 'ca-row-value' }, props.italic ? h('em', props.value) : props.value),
  ]);
};
ReportRow.props = ['label', 'value', 'italic'];

const file = ref(null);
const previewUrl = ref('');
const loading = ref(false);
const error = ref('');
const result = ref(null);
const history = ref([]);
const historyError = ref('');
const deletingId = ref(null);
const viewingId = ref(null);

// Reshape a stored CropAnalysis record into the same shape detectDisease's
// response has, so the existing result section can display it unchanged.
function toViewableResult(item) {
  const confidencePct = (c) => (typeof c === 'number' ? Math.round(c * 100) : null);
  return {
    _id: item._id,
    kind: item.kind,
    image: item.image,
    prediction: {
      label: item.label,
      scientificName: item.scientificName || null,
      crop: item.crop || null,
      confidence: item.confidence,
      confidencePct: confidencePct(item.confidence),
      lowConfidence: item.lowConfidence,
      model: item.modelUsed,
      alternatives: (item.alternatives || []).map((a) => ({
        ...a,
        confidencePct: confidencePct(a.confidence),
      })),
      note: null,
    },
    report: item.report,
    reportSource: item.reportSource,
  };
}

async function viewHistoryItem(item) {
  if (viewingId.value) return;
  historyError.value = '';
  viewingId.value = item._id;
  try {
    const { data } = await getAnalysisHistoryItem(item._id);
    result.value = toViewableResult(data);
    error.value = '';
  } catch (err) {
    historyError.value = err.response?.data?.message || 'Could not load this report. Please try again.';
  } finally {
    viewingId.value = null;
  }
}

function onFile(event) {
  const selected = event.target.files?.[0];
  error.value = '';
  if (!selected) return;
  if (!selected.type.startsWith('image/')) {
    error.value = 'Please select an image file.';
    return;
  }
  if (selected.size > 5 * 1024 * 1024) {
    error.value = 'Image must be 5 MB or smaller.';
    return;
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = selected;
  previewUrl.value = URL.createObjectURL(selected);
  result.value = null;
  event.target.value = '';
}

function reset() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = null;
  previewUrl.value = '';
  result.value = null;
  error.value = '';
}

async function analyze() {
  if (!file.value || loading.value) return;
  loading.value = true;
  error.value = '';
  result.value = null;
  try {
    const { data } = await detectDisease(file.value);
    result.value = data;
    loadHistory();
  } catch (err) {
    error.value = err.response?.data?.message || 'Analysis failed. Please try another image.';
  } finally {
    loading.value = false;
  }
}

async function loadHistory() {
  try {
    const { data } = await getAnalysisHistory('disease');
    history.value = data.slice(0, 6);
  } catch {
    history.value = [];
  }
}

async function handleDelete(item) {
  historyError.value = '';

  const confirmed = await confirmDelete('Are you sure you want to delete this detection record? This cannot be undone.');
  if (!confirmed) return;

  deletingId.value = item._id;
  try {
    await deleteAnalysis(item._id);
    history.value = history.value.filter((h) => h._id !== item._id);
    if (result.value?._id === item._id) result.value = null;
  } catch (err) {
    historyError.value = err.response?.data?.message || 'Could not delete this record. Please try again.';
  } finally {
    deletingId.value = null;
  }
}

function confClass(pred) {
  if (pred.lowConfidence) return 'ca-conf-low';
  if ((pred.confidencePct || 0) >= 70) return 'ca-conf-high';
  return 'ca-conf-mid';
}

function formatDate(d) {
  return new Date(d).toLocaleString();
}

onMounted(loadHistory);
</script>
