<template>
  <fieldset class="address-fields">
    <legend class="address-fields-legend">{{ t('auth.locationSection') }}</legend>

    <div class="row g-2">
      <div class="col-md-6 mb-2">
        <label class="form-label" :for="`${idPrefix}-country`">{{ t('auth.country') }}</label>
        <select
          :id="`${idPrefix}-country`"
          class="form-control"
          :value="address.country"
          @change="updateField('country', $event.target.value)"
        >
          <option v-for="country in countries" :key="country" :value="country">{{ country }}</option>
        </select>
      </div>

      <!-- Division and State never show at the same time: the form swaps
           between them based on the selected country. -->
      <div v-if="isBangladesh" class="col-md-6 mb-2">
        <label class="form-label" :for="`${idPrefix}-division`">{{ t('auth.division') }}</label>
        <select
          :id="`${idPrefix}-division`"
          class="form-control"
          :value="address.division"
          @change="updateField('division', $event.target.value)"
        >
          <option value="">{{ t('auth.selectDivision') }}</option>
          <option v-for="division in divisions" :key="division.name" :value="division.name">
            {{ division.name }}
          </option>
        </select>
      </div>

      <div v-else class="col-md-6 mb-2">
        <label class="form-label" :for="`${idPrefix}-state`">{{ t('auth.state') }}</label>
        <input
          :id="`${idPrefix}-state`"
          type="text"
          class="form-control"
          :value="address.state"
          @input="updateField('state', $event.target.value)"
        />
      </div>

      <div class="col-md-6 mb-2">
        <label class="form-label" :for="`${idPrefix}-district`">{{ t('auth.district') }}</label>

        <!-- Bangladesh has a known district list per division, so offer it as
             a dropdown once a division is chosen; otherwise accept free text. -->
        <select
          v-if="isBangladesh && districtOptions.length > 0"
          :id="`${idPrefix}-district`"
          class="form-control"
          :value="address.district"
          @change="updateField('district', $event.target.value)"
        >
          <option value="">{{ t('auth.selectDistrict') }}</option>
          <option v-for="district in districtOptions" :key="district" :value="district">
            {{ district }}
          </option>
        </select>
        <input
          v-else
          :id="`${idPrefix}-district`"
          type="text"
          class="form-control"
          :value="address.district"
          @input="updateField('district', $event.target.value)"
        />
      </div>

      <div class="col-md-6 mb-2">
        <label class="form-label" :for="`${idPrefix}-upazila`">{{ t('auth.upazila') }}</label>
        <input
          :id="`${idPrefix}-upazila`"
          type="text"
          class="form-control"
          :value="address.upazila"
          @input="updateField('upazila', $event.target.value)"
        />
      </div>

      <div class="col-12 mb-2">
        <label class="form-label" :for="`${idPrefix}-line`">{{ t('auth.addressLine') }}</label>
        <input
          :id="`${idPrefix}-line`"
          type="text"
          class="form-control"
          :value="address.addressLine"
          :placeholder="t('auth.addressLinePlaceholder')"
          @input="updateField('addressLine', $event.target.value)"
        />
      </div>
    </div>
  </fieldset>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { t } from '../i18n';
import { getLocationOptions } from '../services/locationService';
import { emptyAddress } from '../utils/address';

const props = defineProps({
  address: {
    type: Object,
    default: () => emptyAddress(),
  },
  idPrefix: {
    type: String,
    default: 'addr',
  },
});

const emit = defineEmits(['update:address']);

const DEFAULT_COUNTRY = 'Bangladesh';

// Falls back to a minimal local list if the options request fails, so the
// form stays usable offline.
const countries = ref([DEFAULT_COUNTRY, 'India', 'Other']);
const divisions = ref([]);

const isBangladesh = computed(() => props.address.country === DEFAULT_COUNTRY);

const districtOptions = computed(() => {
  for (let i = 0; i < divisions.value.length; i++) {
    if (divisions.value[i].name === props.address.division) {
      return divisions.value[i].districts;
    }
  }

  return [];
});

function updateField(field, value) {
  const next = { ...props.address, [field]: value };

  // Only one of division/state applies, so clear the other when the
  // country changes and reset the district that belonged to it.
  if (field === 'country') {
    if (value === DEFAULT_COUNTRY) {
      next.state = '';
    } else {
      next.division = '';
    }
    next.district = '';
  }

  if (field === 'division') {
    next.district = '';
  }

  emit('update:address', next);
}

onMounted(async () => {
  try {
    const { data } = await getLocationOptions();

    if (data.countries && data.countries.length > 0) {
      countries.value = data.countries;
    }

    if (data.divisions) {
      divisions.value = data.divisions;
    }
  } catch (err) {
    // Keep the fallback lists already in place
  }
});
</script>
