<template>
  <div
    v-if="authState.user?.role !== 'expert'"
    class="tag-access-denied"
  >
    <div class="tag-card">
      <h1>Access Denied</h1>
      <p>Only agricultural experts can manage catalogs.</p>
    </div>
  </div>

  <div v-else class="tag-container">

    <div class="tag-page-header">
      <h1>Catalog Management</h1>
      <p>
        Manage disease tags, fertilizers, and pesticides.
      </p>
    </div>

    <section class="tag-card mb-4">

      <div class="mb-3">
        <label class="form-label">
          Catalog
        </label>

        <select
          v-model="catalogType"
          class="form-select"
        >
          <option value="tags">
            Disease Tags
          </option>

          <option value="fertilizers">
            Fertilizers
          </option>

          <option value="pesticides">
            Pesticides
          </option>
        </select>
      </div>

      <div
        v-if="successMessage"
        class="tag-message tag-success"
      >
        {{ successMessage }}
      </div>

      <div
        v-if="errorMessage"
        class="tag-message tag-error"
      >
        {{ errorMessage }}
      </div>

      <form @submit.prevent="submitItem">

        <div class="mb-3">
          <label class="form-label">
            Name
          </label>

          <input
            v-model="name"
            class="form-control"
            placeholder="Name"
          >
        </div>

        <!-- Disease Tags -->

        <div
          v-if="catalogType === 'tags'"
          class="mb-3"
        >
          <label class="form-label">
            Tag Type
          </label>

          <select
            v-model="tagType"
            class="form-select"
          >
            <option value="symptom">
              Symptom
            </option>

            <option value="farming_condition">
              Farming Condition
            </option>
          </select>
        </div>

        <!-- Fertilizers / Pesticides -->

        <template v-else>

          <div class="mb-3">
            <label class="form-label">
              Category
            </label>

            <input
              v-model="category"
              class="form-control"
              placeholder="Nitrogen, Herbicide, Fungicide..."
            >
          </div>

          <div class="mb-4">
            <label class="form-label">
              Description
            </label>

            <textarea
              v-model="description"
              rows="3"
              class="form-control"
            />
          </div>

        </template>

        <button
          class="btn-pill"
          :disabled="submitting"
        >
          {{ submitting ? "Saving..." : "Create" }}
        </button>

      </form>

    </section>

    <section class="tag-card">

      <div class="d-flex justify-content-between align-items-center mb-3">

        <h2 class="m-0">
          Existing Items
        </h2>

        <button
          class="btn-pill-secondary btn-pill-sm"
          @click="loadItems"
        >
          Refresh
        </button>

      </div>

      <div
        v-if="loading"
        class="loading-state"
      >
        Loading...
      </div>

      <div
        v-else-if="items.length === 0"
        class="text-muted"
      >
        Nothing found.
      </div>

<div
  v-for="item in items"
  :key="item._id"
  class="border rounded p-3 mb-3"
>
  <div v-if="editingId === item._id">

    <input
      v-model="editName"
      class="form-control mb-2"
    >

    <template v-if="catalogType === 'tags'">

      <select
        v-model="editTagType"
        class="form-select mb-2"
      >
        <option value="symptom">
          Symptom
        </option>

        <option value="farming_condition">
          Farming Condition
        </option>
      </select>

    </template>

    <template v-else>

      <input
        v-model="editCategory"
        class="form-control mb-2"
        placeholder="Category"
      >

      <textarea
        v-model="editDescription"
        rows="3"
        class="form-control mb-3"
      />

    </template>

    <button
      class="btn-pill me-2"
      @click="saveEdit"
    >
      Save
    </button>

    <button
      class="btn-pill-outline"
      @click="cancelEdit"
    >
      Cancel
    </button>

  </div>

  <div
    v-else
    class="d-flex justify-content-between"
  >

    <div>

      <strong>{{ item.name }}</strong>

      <div
        v-if="item.type"
        class="text-muted small"
      >
        {{ item.type }}
      </div>

      <div
        v-if="item.category"
        class="text-muted small"
      >
        {{ item.category }}
      </div>

      <div
        v-if="item.description"
        class="mt-2"
      >
        {{ item.description }}
      </div>

    </div>

    <div>

      <button
        v-if="catalogType !== 'tags'"
        class="btn-pill-outline me-2"
        @click="startEdit(item)"
      >
        Edit
      </button>

      <button
        class="btn-pill-danger btn-pill-sm"

        @click="deleteItem(item._id)"
      >
        Delete
      </button>

    </div>

  </div>
</div>

    </section>

  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { authState } from '../stores/auth';

import { confirmDelete } from '../stores/confirm';
const API_BASE = 'http://localhost:5000/api';

const catalogType = ref('tags');

const items = ref([]);

const loading = ref(false);
const submitting = ref(false);

const successMessage = ref('');
const errorMessage = ref('');

const name = ref('');
const tagType = ref('symptom');

const category = ref('');
const description = ref('');

const editingId = ref(null);

const editName = ref('');
const editCategory = ref('');
const editDescription = ref('');
const editTagType = ref('symptom');

function authHeaders() {
  const token = localStorage.getItem('token');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function endpoint() {
  switch (catalogType.value) {
    case 'fertilizers':
      return `${API_BASE}/fertilizers`;

    case 'pesticides':
      return `${API_BASE}/pesticides`;

    default:
      return `${API_BASE}/diseases/tags`;
  }
}

function resetForm() {
  name.value = '';
  tagType.value = 'symptom';
  category.value = '';
  description.value = '';
}

async function loadItems() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch(endpoint(), {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to load items');
    }

    items.value = await response.json();
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function submitItem() {
  successMessage.value = '';
  errorMessage.value = '';

  submitting.value = true;

  try {
    let body;

    if (catalogType.value === 'tags') {
      body = {
        name: name.value,
        type: tagType.value,
      };
    } else {
      body = {
        name: name.value,
        category: category.value,
        description: description.value,
      };
    }

    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed');
    }

    successMessage.value = 'Created successfully.';

    resetForm();

    await loadItems();
  } catch (err) {
    errorMessage.value = err.message;
  } finally {
    submitting.value = false;
  }
}

async function deleteItem(id) {
  const confirmed = await confirmDelete('Are you sure you want to delete this item?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${endpoint()}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Delete failed');
    }

    successMessage.value = 'Deleted successfully.';

    await loadItems();
  } catch (err) {
    errorMessage.value = err.message;
  }
}

function startEdit(item) {
  editingId.value = item._id;

  editName.value = item.name;
  editCategory.value = item.category || '';
  editDescription.value = item.description || '';
  editTagType.value = item.type || 'symptom';
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit() {
  try {
    let body;

    if (catalogType.value === 'tags') {
      body = {
        name: editName.value,
        type: editTagType.value,
      };
    } else {
      body = {
        name: editName.value,
        category: editCategory.value,
        description: editDescription.value,
      };
    }

    const response = await fetch(
      `${endpoint()}/${editingId.value}`,
      {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Update failed');
    }

    successMessage.value = 'Updated successfully.';

    editingId.value = null;

    await loadItems();
  } catch (err) {
    errorMessage.value = err.message;
  }
}

watch(catalogType, () => {
  resetForm();
  loadItems();
});

onMounted(loadItems);
</script>
