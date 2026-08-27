<template>
  <aside v-if="authState.user?.role === 'organization_owner'" class="org-sidebar">
    <router-link to="/organizations/new" class="btn-pill-outline org-sidebar-btn">
      Add Organization
    </router-link>
    <router-link
      to="/organizations/mine"
      class="org-sidebar-btn"
      :class="isMine ? 'btn-pill' : 'btn-pill-outline'"
    >
      My Organizations
    </router-link>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { authState } from '../stores/auth';

const route = useRoute();
const isMine = computed(() => route.path === '/organizations/mine');
</script>
