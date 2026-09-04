<template>
  <div class="container notfound-page">
    <div class="notfound-card">
      <span class="notfound-mark" aria-hidden="true">404</span>
      <h1>{{ t('notFound.title') }}</h1>
      <p>{{ t('notFound.body') }}</p>
      <div class="notfound-actions">
        <router-link to="/" class="btn-pill">{{ t('notFound.goHome') }}</router-link>
        <router-link
          v-if="authState.user?.role === 'farmer'"
          to="/dashboard"
          class="btn-pill-outline"
        >{{ t('notFound.goDashboard') }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '../i18n';
import { authState } from '../stores/auth';
</script>
