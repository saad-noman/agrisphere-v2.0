const llm = require('./llmService');

const DISCLAIMER =
  'AI detection is a decision-support estimate, not a guaranteed professional diagnosis. ' +
  'Confirm with an agricultural expert before applying treatments.';

const REPORT_FIELDS = [
  'diseaseName', 'affectedCrop', 'symptoms', 'cause', 'transmission',
  'favorableConditions', 'prevention', 'culturalManagement', 'biologicalControl',
  'treatment', 'regionalNotes', 'sources', 'notes',
];

function toDisplayString(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(toDisplayString).filter(Boolean).join('; ');
  if (typeof value === 'object') return Object.values(value).map(toDisplayString).filter(Boolean).join('; ');
  return String(value);
}

// To normalize the LLM's raw report into the flat string shape the frontend expects
function normalizeReport(raw, fallbackLabel, fallbackCrop) {
  const report = {};
  for (const field of REPORT_FIELDS) {
    report[field] = toDisplayString(raw?.[field]);
  }
  if (!report.diseaseName) report.diseaseName = fallbackLabel || '';
  if (!report.affectedCrop) report.affectedCrop = fallbackCrop || '';
  return report;
}

const REPORT_JSON_SHAPE =
  'Return a JSON object with keys: diseaseName, affectedCrop, symptoms, cause, transmission, ' +
  'favorableConditions, prevention, culturalManagement, biologicalControl, treatment, regionalNotes, sources, notes. ' +
  'Every value must be a single plain string (never an array or nested object) — for multiple points, ' +
  'write them as one string separated by "; ".';

// To ask the LLM to generate a disease report for the detected label/crop
async function buildReportWithLlm(label, crop) {
  const system =
    'You are a plant pathology assistant for an agricultural platform called AgriSphere. ' +
    'A crop disease-detection model identified a possible condition from a photo. Provide well-established, ' +
    'reliable general agricultural/plant-pathology knowledge about it — do not invent specifics you are not ' +
    'reasonably confident about. ' +
    REPORT_JSON_SHAPE +
    ' In "sources" briefly state the type of knowledge this is based on (general agricultural knowledge). ' +
    'In "notes" add a short disclaimer that AI detection is not a guaranteed professional diagnosis.';
  const user = `Detected disease/condition: ${label}${crop ? ` on ${crop}` : ''}`;
  return llm.chatJson([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}

// To build a minimal report when the LLM is unavailable
function buildUnavailableReport(label, crop) {
  return {
    diseaseName: label || 'Unknown',
    affectedCrop: crop || '',
    symptoms: '',
    cause: '',
    transmission: '',
    favorableConditions: '',
    prevention: '',
    culturalManagement: '',
    biologicalControl: '',
    treatment: 'Detailed information is not available right now. Please consult an agricultural expert.',
    regionalNotes: '',
    sources: '',
    notes: DISCLAIMER,
  };
}

// To get a disease report for a detected label/crop, from the LLM or a fallback
async function getDiseaseReport(label, crop) {
  if (llm.isConfigured()) {
    try {
      const raw = await buildReportWithLlm(label, crop);
      return { report: normalizeReport(raw, label, crop), source: 'llm' };
    } catch (err) {
      console.error('agriKnowledgeService: LLM report generation failed —', err.message);
    }
  }

  return { report: buildUnavailableReport(label, crop), source: 'knowledge-base' };
}

module.exports = { getDiseaseReport };
