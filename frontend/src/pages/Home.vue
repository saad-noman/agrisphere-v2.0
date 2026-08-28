<template>
  <div class="home">
    <section class="hero">
      <h1>{{ headline }}</h1>
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

    <!-- Home highlights only the four core features. Everything else stays
         reachable from the navbar/drawer; this is purely about what the
         home page promotes. Cards are identical for logged-in and logged-out
         users so nobody sees irrelevant clutter. -->
    <section class="core-features-section container">
      <h2 class="quick-links-title">What you can do on AgriSphere</h2>
      <div class="core-features-grid">
        <router-link
          v-for="feature in coreFeatures"
          :key="feature.to"
          :to="feature.to"
          class="core-feature-card"
        >
          <span class="core-feature-icon">{{ feature.icon }}</span>
          <span class="core-feature-body">
            <span class="core-feature-title">{{ feature.label }}</span>
            <span class="core-feature-desc">{{ feature.description }}</span>
          </span>
          <svg class="core-feature-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </router-link>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { authState } from '../stores/auth';

// Greets a signed-in user by first name; falls back to the product headline
// for guests. Uses the same auth store the rest of the app reads from.
const headline = computed(() => {
  const first = authState.user?.name?.split(' ')[0];
  return first ? `Hello, ${first}` : 'Welcome to AgriSphere';
});

// The four core features promoted on the home page. Each points at an
// existing route — no new or placeholder destinations.
const coreFeatures = [
  {
    to: '/experts',
    icon: '\u{1F469}\u200D\u{1F33E}',
    label: 'Consult with Experts',
    description: 'Find agricultural experts and request a consultation.',
  },
  {
    to: '/organizations',
    icon: '\u{1F3E2}',
    label: 'Find Agricultural Organization',
    description: 'Browse organizations and services near you.',
  },
  {
    to: '/crop-analysis',
    icon: '\u{1F9EA}',
    label: 'AI-Based Solution',
    description: 'Detect crop diseases and get AI-driven guidance.',
  },
  {
    to: '/map',
    icon: '\u{1F5FA}\uFE0F',
    label: 'Interactive Map',
    description: 'Locate experts, organizations and services on the map.',
  },
];
</script>
