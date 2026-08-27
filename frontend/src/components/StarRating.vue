<template>
  <span class="star-rating" :class="{ picker: interactive }">
    <span
      v-for="n in 5"
      :key="n"
      class="star"
      :class="{ empty: n > displayValue }"
      @mouseenter="interactive && (hoverValue = n)"
      @mouseleave="interactive && (hoverValue = 0)"
      @click="interactive && $emit('change', n)"
    >★</span>
    <span v-if="count !== null" class="star-rating-count">
      {{ value.toFixed(1) }} ({{ count }})
    </span>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  count: { type: Number, default: null },
  interactive: { type: Boolean, default: false },
});
defineEmits(['change']);

const hoverValue = ref(0);
const displayValue = computed(() => hoverValue.value || Math.round(props.value));
</script>
