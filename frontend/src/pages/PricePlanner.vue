<template>
  <div class="price-planner container py-4">
    <div class="page-header">
      <h1>Price Planner</h1>
      <p>
        Estimate what your seeds, fertilizers and pesticides will cost. Pull live
        market prices where available, or enter your own local price.
      </p>
    </div>

    <div v-if="notice" class="app-alert app-alert-success mb-3">{{ notice }}</div>
    <div v-if="error" class="app-alert app-alert-danger mb-3">{{ error }}</div>

    <div class="row g-3">
      <!-- ---------------- Plan builder ---------------- -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <div class="row g-3 mb-3">
              <div class="col-md-7">
                <label class="form-label" for="plan-name">Plan name</label>
                <input
                  id="plan-name"
                  v-model="planName"
                  type="text"
                  class="form-control"
                  placeholder="e.g. Boro season inputs"
                  maxlength="140"
                />
              </div>
              <div class="col-md-5">
                <label class="form-label" for="plan-notes">Notes (optional)</label>
                <input
                  id="plan-notes"
                  v-model="planNotes"
                  type="text"
                  class="form-control"
                  placeholder="Anything worth remembering"
                  maxlength="1000"
                />
              </div>
            </div>

            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th style="min-width: 140px">Item</th>
                    <th style="min-width: 110px">Category</th>
                    <th style="min-width: 74px">Qty</th>
                    <th style="min-width: 70px">Unit</th>
                    <th style="min-width: 100px">Unit price</th>
                    <th class="text-end" style="min-width: 92px">Subtotal</th>
                    <th class="planner-action-col"><span class="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in items" :key="i">
                    <td data-label="Item">
                      <input
                        v-model="item.name"
                        type="text"
                        class="form-control form-control-sm"
                        list="item-catalog"
                        placeholder="Urea, Wheat…"
                        :aria-label="`Item ${i + 1} name`"
                      />
                      <small v-if="item.priceSource === 'live'" class="price-live-tag">
                        live price{{ item.priceSymbol ? ` · ${item.priceSymbol}` : '' }}
                      </small>
                      <small v-else-if="item.priceNote" class="price-note-tag">{{ item.priceNote }}</small>
                    </td>
                    <td data-label="Category">
                      <select v-model="item.category" class="form-select form-select-sm" :aria-label="`Item ${i + 1} category`">
                        <option value="seed">Seed / Crop</option>
                        <option value="fertilizer">Fertilizer</option>
                        <option value="pesticide">Pesticide</option>
                        <option value="other">Other</option>
                      </select>
                    </td>
                    <td data-label="Qty">
                      <input
                        v-model="item.quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        class="form-control form-control-sm"
                        :aria-label="`Item ${i + 1} quantity`"
                      />
                    </td>
                    <td data-label="Unit">
                      <input
                        v-model="item.unit"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="kg"
                        maxlength="24"
                        :aria-label="`Item ${i + 1} unit`"
                      />
                    </td>
                    <td data-label="Unit price">
                      <input
                        v-model="item.unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        class="form-control form-control-sm"
                        :aria-label="`Item ${i + 1} unit price`"
                        @input="item.priceSource = 'manual'"
                      />
                    </td>
                    <td class="text-end fw-bold" data-label="Subtotal">{{ money(subtotal(item)) }}</td>
                    <td data-label="" class="planner-action-cell">
                      <button
                        type="button"
                        class="planner-remove-btn"
                        :disabled="items.length === 1"
                        :title="`Remove item ${i + 1}`"
                        :aria-label="`Remove item ${i + 1}`"
                        @click="removeItem(i)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <datalist id="item-catalog">
              <option v-for="c in catalogNames" :key="c" :value="c" />
            </datalist>

            <div class="planner-actions">
              <button type="button" class="btn-pill-outline" @click="addItem">Add item</button>
              <button
                type="button"
                class="btn-pill-outline"
                :disabled="pricing"
                @click="fetchLivePrices"
              >
                {{ pricing ? 'Fetching prices…' : 'Fetch live prices' }}
              </button>
              <div class="planner-total">
                <span>Grand total</span>
                <strong>{{ money(grandTotal) }}</strong>
              </div>
            </div>

            <p v-if="priceMeta" class="price-meta">
              Source: {{ priceMeta.source }} · retrieved {{ formatDateTime(priceMeta.fetchedAt) }}
            </p>

            <div class="planner-actions mt-3">
              <button type="button" class="btn-pill" :disabled="saving" @click="savePlan">
                {{ saving ? 'Saving…' : editingId ? 'Update plan' : 'Save plan' }}
              </button>
              <button type="button" class="btn-pill-outline" @click="exportPdf">Export PDF</button>
              <button v-if="editingId" type="button" class="btn-pill-secondary" @click="resetForm">
                New plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ---------------- Saved plans ---------------- -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <h3 class="h5 mb-3">Saved plans</h3>

            <p v-if="loadingPlans" class="loading-state">Loading plans…</p>
            <p v-else-if="plans.length === 0" class="empty-state">
              No saved plans yet. Build one and press Save.
            </p>

            <ul v-else class="list-group saved-plan-list">
              <li v-for="p in plans" :key="p._id" class="list-group-item">
                <div class="saved-plan-head">
                  <button type="button" class="saved-plan-name" @click="loadPlan(p._id)">
                    {{ p.name }}
                  </button>
                  <span class="fw-bold">{{ money(p.grandTotal) }}</span>
                </div>
                <div class="text-muted small">
                  {{ p.items.length }} item{{ p.items.length === 1 ? '' : 's' }} ·
                  {{ formatDateTime(p.createdAt) }}
                </div>
                <div class="saved-plan-actions">
                  <button type="button" class="btn-pill-outline btn-pill-sm" @click="loadPlan(p._id)">
                    Open
                  </button>
                  <button
                    type="button"
                    class="btn-pill-outline btn-pill-sm"
                    :disabled="refreshingId === p._id"
                    @click="refreshPrices(p._id)"
                  >
                    {{ refreshingId === p._id ? 'Refreshing…' : 'Refresh prices' }}
                  </button>
                  <button type="button" class="btn-pill-danger btn-pill-sm" @click="removePlan(p)">
                    Delete
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  lookupPrices,
  getCatalog,
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  refreshPlanPrices,
  deletePlan,
} from '../services/pricePlanService';
import { confirmDelete } from '../stores/confirm';

const items = ref([blankItem()]);
const planName = ref('');
const planNotes = ref('');
const plans = ref([]);
const catalogNames = ref([]);
const editingId = ref(null);
const priceMeta = ref(null);

const loadingPlans = ref(false);
const pricing = ref(false);
const saving = ref(false);
const refreshingId = ref(null);
const error = ref('');
const notice = ref('');

function blankItem() {
  return {
    name: '',
    category: 'other',
    quantity: 1,
    unit: 'kg',
    unitPrice: 0,
    notes: '',
    priceSource: 'manual',
    priceSymbol: null,
    priceCurrency: 'USD',
    priceRetrievedAt: null,
    priceNote: '',
  };
}

// Rounding mirrors the server so displayed and stored totals agree
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const money = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0).toFixed(2);

const subtotal = (item) => {
  const q = Number(item.quantity);
  const p = Number(item.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return 0;
  return round2(round2(q) * round2(p));
};

const grandTotal = computed(() => round2(items.value.reduce((sum, i) => sum + subtotal(i), 0)));

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function addItem() {
  items.value.push(blankItem());
}

function removeItem(i) {
  if (items.value.length === 1) return;
  items.value.splice(i, 1);
}

function resetForm() {
  items.value = [blankItem()];
  planName.value = '';
  planNotes.value = '';
  editingId.value = null;
  priceMeta.value = null;
  notice.value = '';
  error.value = '';
}

function clearMessages() {
  error.value = '';
  notice.value = '';
}

async function loadCatalog() {
  try {
    const { data } = await getCatalog();
    const all = [...(data.seed || []), ...(data.fertilizer || []), ...(data.pesticide || [])];
    catalogNames.value = [...new Set(all.map((x) => x.name))];
  } catch {
    /* suggestions are optional */
  }
}

async function loadPlans() {
  loadingPlans.value = true;
  try {
    const { data } = await getPlans();
    plans.value = data;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load saved plans.';
  } finally {
    loadingPlans.value = false;
  }
}

// Fetches live prices. Items without one keep the price the farmer typed.
async function fetchLivePrices() {
  clearMessages();
  const names = items.value.map((i) => i.name.trim()).filter(Boolean);
  if (names.length === 0) {
    error.value = 'Add at least one item name before fetching prices.';
    return;
  }

  pricing.value = true;
  try {
    const { data } = await lookupPrices(names);
    const byName = new Map((data.results || []).map((r) => [r.name.toLowerCase(), r]));
    let matched = 0;
    const missing = [];

    items.value.forEach((item) => {
      const hit = byName.get(item.name.trim().toLowerCase());
      if (!item.name.trim()) return;
      if (hit && hit.available) {
        item.unitPrice = hit.unitPrice;
        item.priceSource = 'live';
        item.priceSymbol = hit.symbol;
        item.priceCurrency = hit.currency || 'USD';
        item.priceRetrievedAt = data.fetchedAt;
        item.priceNote = '';
        if (hit.unit) item.unit = hit.unit;
        matched += 1;
      } else {
        item.priceNote = hit?.reason || 'No live price — enter it manually';
        missing.push(item.name.trim());
      }
    });

    priceMeta.value = matched > 0 ? { source: data.source, fetchedAt: data.fetchedAt } : null;

    if (matched === 0) {
      error.value = `No live prices available for: ${missing.join(', ')}. Please enter prices manually.`;
    } else {
      notice.value =
        `Updated ${matched} item${matched === 1 ? '' : 's'} with live prices.` +
        (missing.length ? ` No live price for: ${missing.join(', ')}.` : '');
    }
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Live pricing is unavailable right now. You can still enter prices manually.';
  } finally {
    pricing.value = false;
  }
}

function payload() {
  return {
    name: planName.value.trim(),
    notes: planNotes.value.trim(),
    items: items.value
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        category: i.category,
        quantity: Number(i.quantity) || 0,
        unit: i.unit,
        unitPrice: Number(i.unitPrice) || 0,
        notes: i.notes,
        priceSource: i.priceSource,
        priceSymbol: i.priceSymbol,
        priceCurrency: i.priceCurrency,
        priceRetrievedAt: i.priceRetrievedAt,
      })),
  };
}

async function savePlan() {
  clearMessages();
  const body = payload();
  if (!body.name) {
    error.value = 'Please give the plan a name.';
    return;
  }
  if (body.items.length === 0) {
    error.value = 'Add at least one item with a name.';
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await updatePlan(editingId.value, body);
      notice.value = 'Plan updated.';
    } else {
      const { data } = await createPlan(body);
      editingId.value = data._id;
      notice.value = 'Plan saved.';
    }
    await loadPlans();
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not save the plan.';
  } finally {
    saving.value = false;
  }
}

async function loadPlan(id) {
  clearMessages();
  try {
    const { data } = await getPlan(id);
    editingId.value = data._id;
    planName.value = data.name;
    planNotes.value = data.notes || '';
    items.value = data.items.map((i) => ({ ...blankItem(), ...i, priceNote: '' }));
    priceMeta.value = data.pricesUpdatedAt
      ? { source: data.priceSourceName || 'CommodityPriceAPI', fetchedAt: data.pricesUpdatedAt }
      : null;
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not open that plan.';
  }
}

// Re-prices a saved plan against current live prices
async function refreshPrices(id) {
  clearMessages();
  refreshingId.value = id;
  try {
    const { data } = await refreshPlanPrices(id);
    notice.value = data.unavailable?.length
      ? `Prices refreshed. Kept previous price for: ${data.unavailable.join(', ')}.`
      : 'Prices refreshed from the live source.';
    await loadPlans();
    if (editingId.value === id) await loadPlan(id);
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not refresh prices.';
  } finally {
    refreshingId.value = null;
  }
}

async function removePlan(plan) {
  if (!(await confirmDelete(`Are you sure you want to delete "${plan.name}"?`))) return;
  clearMessages();
  try {
    await deletePlan(plan._id);
    if (editingId.value === plan._id) resetForm();
    await loadPlans();
    notice.value = 'Plan deleted.';
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not delete the plan.';
  }
}

// Builds a printable PDF of the current plan.
async function exportPdf() {
  clearMessages();
  const rows = items.value.filter((i) => i.name.trim());
  if (rows.length === 0) {
    error.value = 'Add at least one item before exporting.';
    return;
  }

  try {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const autoTable = autoTableModule.default || autoTableModule.autoTable;

    const doc = new jsPDF();
    const title = planName.value.trim() || 'Price Plan';

    doc.setFontSize(16);
    doc.text('AgriSphere — Price Plan', 14, 18);
    doc.setFontSize(12);
    doc.text(title, 14, 27);
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 14, 34);
    if (planNotes.value.trim()) {
      doc.text(`Notes: ${planNotes.value.trim()}`, 14, 40);
    }

    autoTable(doc, {
      startY: planNotes.value.trim() ? 46 : 40,
      head: [['Item', 'Category', 'Qty', 'Unit', 'Unit price', 'Subtotal']],
      body: rows.map((i) => [
        i.name,
        i.category,
        String(i.quantity),
        i.unit,
        money(i.unitPrice),
        money(subtotal(i)),
      ]),
      foot: [['', '', '', '', 'Grand total', money(grandTotal.value)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [47, 107, 58] },
      footStyles: { fillColor: [234, 243, 236], textColor: 20, fontStyle: 'bold' },
    });

    const endY = (doc.lastAutoTable?.finalY || 60) + 10;
    doc.setFontSize(8);
    if (priceMeta.value) {
      doc.text(
        `Live prices from ${priceMeta.value.source}, retrieved ${formatDateTime(priceMeta.value.fetchedAt)}.`,
        14,
        endY
      );
      doc.text('Items without a live price were entered manually.', 14, endY + 5);
    } else {
      doc.text('All prices in this plan were entered manually.', 14, endY);
    }
    doc.text('Reference/shopping document only — not an order or invoice.', 14, endY + 10);

    doc.save(`${title.replace(/[^\w\-]+/g, '_')}.pdf`);
    notice.value = 'PDF exported.';
  } catch (err) {
    error.value = 'Could not generate the PDF.';
    console.error(err);
  }
}

onMounted(() => {
  loadPlans();
  loadCatalog();
});
</script>
