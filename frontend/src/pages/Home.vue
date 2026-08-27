<template>
  <div class="home">
    <section class="hero">
      <h1>Welcome to AgriSphere</h1>
      <p>
        Empowering farmers through community knowledge, smart technology,
        and data-driven agriculture.
      </p>

      <div class="hero-actions" v-if="!authState.user">
        <router-link to="/login" class="btn-pill-outline">Login</router-link>
        <router-link to="/register" class="btn-pill">Get Started</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'farmer'">
        <router-link to="/dashboard" class="btn-pill">Go to Dashboard</router-link>
        <router-link to="/disease-submission" class="btn-pill-outline">Submit Disease Case</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'expert'">
        <router-link to="/consultations/pending" class="btn-pill">Pending Requests</router-link>
        <router-link to="/disease-library" class="btn-pill-outline">Disease Library</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'organization_owner'">
        <router-link to="/organizations/mine" class="btn-pill">My Organizations</router-link>
        <router-link to="/organizations/new" class="btn-pill-outline">Add Organization</router-link>
      </div>
    </section>

    <section v-if="authState.user" class="quick-links-section container">
      <h2 class="quick-links-title">Quick Access</h2>
      <div class="quick-links-grid">
        <router-link v-for="link in quickLinks" :key="link.to" :to="link.to" class="quick-link-card">
          <span class="quick-link-icon">{{ link.icon }}</span>
          <span class="quick-link-label">{{ link.label }}</span>
        </router-link>
      </div>
    </section>

    <section v-else class="features-section container">
      <h2 class="quick-links-title">What you can do on AgriSphere</h2>
      <div class="quick-links-grid">
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">👩‍🌾</span>
          <span class="quick-link-label">Consult Agricultural Experts</span>
        </div>
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">🩺</span>
          <span class="quick-link-label">Diagnose Crop Diseases</span>
        </div>
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">📊</span>
          <span class="quick-link-label">Track Farm Records &amp; Finances</span>
        </div>
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">🗺️</span>
          <span class="quick-link-label">Locate Services on the Map</span>
        </div>
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">🌦️</span>
          <span class="quick-link-label">Check Local Weather</span>
        </div>
        <div class="quick-link-card feature-card">
          <span class="quick-link-icon">🌱</span>
          <span class="quick-link-label">Get Crop Recommendations</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { authState } from '../stores/auth';

const quickLinks = computed(() => {
  const role = authState.user?.role;

  if (role === 'farmer') {
    return [
      { to: '/dashboard', icon: '📊', label: 'Dashboard' },
      { to: '/farm-records', icon: '🌾', label: 'Farm Records' },
      { to: '/disease-submission', icon: '🩺', label: 'Submit Disease Case' },
      { to: '/diagnosis-history', icon: '📋', label: 'Diagnosis History' },
      { to: '/financial-analysis', icon: '💰', label: 'Financial Analysis' },
      { to: '/expense-management', icon: '🧾', label: 'Manage Expenses' },
      { to: '/seasonal-performance', icon: '📈', label: 'Seasonal Performance' },
      { to: '/timeline', icon: '🕒', label: 'Activity Timeline' },
      { to: '/experts', icon: '👩‍🌾', label: 'Find an Expert' },
      { to: '/organizations', icon: '🏢', label: 'Organizations' },
      { to: '/map', icon: '🗺️', label: 'Services Map' },
      { to: '/farming-recommendation', icon: '🌱', label: 'Crop Recommendation' },
    ];
  }

  if (role === 'expert') {
    return [
      { to: '/consultations/pending', icon: '📥', label: 'Pending Requests' },
      { to: '/consultations/records', icon: '📝', label: 'Consultation Record' },
      { to: '/provide-crop-diagnosis-report', icon: '🩺', label: 'Provide Diagnosis Report' },
      { to: '/disease-library', icon: '📚', label: 'Disease Library' },
      { to: '/tag-management', icon: '🏷️', label: 'Manage Disease Tags' },
      { to: '/farming-expertise/provide', icon: '🌱', label: 'Farming Expertise' },
      { to: '/experts', icon: '👩‍🌾', label: 'Experts Directory' },
      { to: '/map', icon: '🗺️', label: 'Services Map' },
    ];
  }

  if (role === 'organization_owner') {
    return [
      { to: '/organizations/mine', icon: '🏢', label: 'My Organizations' },
      { to: '/organizations/new', icon: '➕', label: 'Add Organization' },
      { to: '/organizations', icon: '🏛️', label: 'Organizations Directory' },
      { to: '/experts', icon: '👩‍🌾', label: 'Experts Directory' },
      { to: '/map', icon: '🗺️', label: 'Services Map' },
    ];
  }

  return [
    { to: '/experts', icon: '👩‍🌾', label: 'Experts Directory' },
    { to: '/organizations', icon: '🏢', label: 'Organizations' },
    { to: '/map', icon: '🗺️', label: 'Services Map' },
  ];
});
</script>
