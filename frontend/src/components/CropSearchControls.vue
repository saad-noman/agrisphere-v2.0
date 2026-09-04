<template>
  <div class="crop-controls" :class="`crop-controls-${layout}`">
    <div class="crop-control">
      <label class="form-label" :for="`${uid}-search`">{{ t('marketplace.searchCrop') }}</label>
      <input
        :id="`${uid}-search`"
        v-model="query.search"
        type="search"
        class="form-control"
        :placeholder="t('marketplace.searchPlaceholder')"
      />
    </div>

    <div class="crop-control">
      <label class="form-label" :for="`${uid}-sort`">{{ t('marketplace.sortBy') }}</label>
      <select :id="`${uid}-sort`" v-model="query.sort" class="form-control">
        <option v-for="option in SORT_OPTIONS" :key="option" :value="option">
          {{ t(`marketplace.sort.${option}`) }}
        </option>
      </select>
    </div>

    <div class="crop-control">
      <label class="form-label" :for="`${uid}-category`">{{ t('marketplace.category') }}</label>
      <select :id="`${uid}-category`" v-model="query.category" class="form-control">
        <option value="">{{ t('marketplace.allCategories') }}</option>
        <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">
          {{ t(`market2.${option}`) }}
        </option>
      </select>
    </div>

    <div class="crop-control">
      <label class="form-label" :for="`${uid}-district`">{{ t('marketplace.district') }}</label>
      <input
        :id="`${uid}-district`"
        v-model="query.district"
        type="text"
        class="form-control"
        :placeholder="t('marketplace.anyDistrict')"
      />
    </div>

    <div class="crop-control">
      <label class="form-label">{{ t('marketplace.priceRange') }}</label>
      <div class="d-flex gap-2">
        <input
          v-model="query.minPrice"
          type="number"
          min="0"
          step="any"
          class="form-control"
          :placeholder="t('marketplace.min')"
          :aria-label="t('marketplace.min')"
        />
        <input
          v-model="query.maxPrice"
          type="number"
          min="0"
          step="any"
          class="form-control"
          :placeholder="t('marketplace.max')"
          :aria-label="t('marketplace.max')"
        />
      </div>
    </div>

    <div class="crop-control crop-control-action">
      <button type="button" class="btn-pill-secondary w-100" @click="emit('clear')">
        {{ t('marketplace.clearFilters') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { t } from '../i18n';

// Shared by both browse layouts so the two never drift apart. `query` is the
// parent's reactive object: binding v-model to its fields updates it in place,
// which is what keeps the single source of truth.
const props = defineProps({
  query: { type: Object, required: true },
  layout: { type: String, default: 'sidebar' }, // 'sidebar' | 'bar'
  uid: { type: String, default: 'crop' },
});

const emit = defineEmits(['clear']);

const SORT_OPTIONS = ['newest', 'priceLow', 'priceHigh', 'quantityHigh', 'cropAsc'];
const CATEGORY_OPTIONS = ['crop', 'seed', 'pesticide', 'fertilizer', 'equipment', 'other'];
</script>
