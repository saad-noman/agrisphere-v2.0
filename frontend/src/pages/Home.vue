<template>
  <div class="home">
    <section class="hero">
      <h1>{{ headline }}</h1>
      <p>{{ t('home.subtitle') }}</p>

      <div class="hero-actions" v-if="!authState.user">
        <router-link to="/login" class="btn-pill-outline">{{ t('nav.login') }}</router-link>
        <router-link to="/register" class="btn-pill">{{ t('nav.getStarted') }}</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'farmer'">
        <router-link to="/dashboard" class="btn-pill">{{ t('home.goToDashboard') }}</router-link>
        <router-link to="/crop-intelligence" class="btn-pill-outline">{{ t('nav.cropIntelligence') }}</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'expert'">
        <router-link to="/consultations/pending" class="btn-pill">{{ t('nav.pendingRequests') }}</router-link>
        <router-link to="/disease-library" class="btn-pill-outline">{{ t('nav.diseaseLibrary') }}</router-link>
      </div>

      <div class="hero-actions" v-else-if="authState.user?.role === 'organization_owner'">
        <router-link to="/organizations/mine" class="btn-pill">{{ t('nav.myOrganizations') }}</router-link>
        <router-link to="/organizations/new" class="btn-pill-outline">{{ t('nav.addOrganization') }}</router-link>
      </div>
    </section>

    <!-- Core features promoted on the home page -->
    <section class="core-features-section container">
      <h2 class="quick-links-title">{{ t('home.whatYouCanDo') }}</h2>
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

    <!-- Platform totals. Numbers count up from 0 once this section scrolls
         into view; they stay at 0 (no visible count-up) if the stats
         request fails, same fail-quiet approach as the rest of this page. -->
    <section ref="statsSectionRef" class="home-stats-section container">
      <div class="home-stats-shape" aria-hidden="true"></div>
      <div class="home-stats-grid">
        <div v-for="stat in statCards" :key="stat.key" class="home-stat-card">
          <span class="home-stat-value">{{ stat.value }}</span>
          <span class="home-stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { authState } from '../stores/auth';
import { getPlatformStats } from '../services/statsService';
import { t, n } from '../i18n';

// Greets a signed-in user by first name, or the product headline for guests
const headline = computed(() => {
  const first = authState.user?.name?.split(' ')[0];
  return first ? t('home.greeting', { name: first }) : t('home.welcome');
});

// Core features promoted on the home page. Computed rather than a constant so
// the labels re-render when the language changes.
const coreFeatures = computed(() => [
  {
    to: '/crop-intelligence',
    icon: '\u{1F33E}',
    label: t('home.features.intelTitle'),
    description: t('home.features.intelDesc'),
  },
  {
    to: '/experts',
    icon: '\u{1F469}\u200D\u{1F33E}',
    label: t('home.features.expertsTitle'),
    description: t('home.features.expertsDesc'),
  },
  {
    to: '/organizations',
    icon: '\u{1F3E2}',
    label: t('home.features.orgTitle'),
    description: t('home.features.orgDesc'),
  },
  {
    to: '/crop-analysis',
    icon: '\u{1F9EA}',
    label: t('home.features.aiTitle'),
    description: t('home.features.aiDesc'),
  },
  {
    to: '/map',
    icon: '\u{1F5FA}\uFE0F',
    label: t('home.features.mapTitle'),
    description: t('home.features.mapDesc'),
  },
  {
    to: '/community',
    icon: '\u{1F4AC}',
    label: t('home.features.communityTitle'),
    description: t('home.features.communityDesc'),
  },
  {
    to: '/price-planner',
    icon: '\u{1F9EE}',
    label: t('home.features.priceTitle'),
    description: t('home.features.priceDesc'),
  },
]);

// Platform totals shown right below the quick-access cards. The displayed
// numbers (statCards) count up from 0 to the fetched totals (targetCounts)
// once the section scrolls into view — see startCountUp().
const targetCounts = ref({ experts: 0, farmers: 0, organizations: 0 });
const displayCounts = ref({ experts: 0, farmers: 0, organizations: 0 });
const statCards = computed(() => [
  { key: 'experts', label: t('home.stats.experts'), value: n(displayCounts.value.experts) },
  { key: 'farmers', label: t('home.stats.farmers'), value: n(displayCounts.value.farmers) },
  {
    key: 'organizations',
    label: t('home.stats.organizations'),
    value: n(displayCounts.value.organizations),
  },
]);

const statsSectionRef = ref(null);
let statsObserver = null;
let statsLoaded = false;
let sectionVisible = false;
let statsAnimated = false;

async function loadStats() {
  try {
    const { data } = await getPlatformStats();
    targetCounts.value = {
      experts: data.experts || 0,
      farmers: data.farmers || 0,
      organizations: data.organizations || 0,
    };
  } catch {
    /* Totals are a decorative extra — leave the counters at 0 on failure. */
  }
  statsLoaded = true;
  maybeStartCountUp();
}

function animateCount(key, target, duration = 1400) {
  if (target <= 0) return;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    displayCounts.value[key] = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function maybeStartCountUp() {
  if (statsAnimated || !statsLoaded || !sectionVisible) return;
  statsAnimated = true;
  animateCount('experts', targetCounts.value.experts);
  animateCount('farmers', targetCounts.value.farmers);
  animateCount('organizations', targetCounts.value.organizations);
}

onMounted(() => {
  loadStats();

  if (statsSectionRef.value) {
    statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            sectionVisible = true;
            maybeStartCountUp();
          }
        });
      },
      { threshold: 0.3 }
    );
    statsObserver.observe(statsSectionRef.value);
  }
});

onBeforeUnmount(() => {
  if (statsObserver) statsObserver.disconnect();
});
</script>

<style scoped>
/* The shared .core-features-grid (theme.css) uses CSS Grid with equal-width
   columns, which packs an incomplete last row (not enough cards to fill the
   row) to the left instead of centering it. Flexbox wrap centers each row
   independently, including a short final row.
   Card width is a percentage of the row (matching the original 4-per-row
   layout: 25% minus its share of the gaps) rather than a fixed pixel guess,
   so a card is exactly the same size everywhere — a 4-card row and a
   2-card row compute the identical width, only the row's leftover space
   changes. flex-grow stays 0 so nothing stretches to fill a short row.
   min-width preserves the original minmax(260px, …) floor so it still
   wraps down to fewer columns on narrower screens instead of shrinking
   cards past a usable size. Scoped to this page only since these classes
   are only used here. */
.core-features-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.core-feature-card {
  flex: 0 1 calc(25% - 12px);
  min-width: 260px;
}

/* Platform totals. One continuous translucent band sits behind the whole
   row (not one box per number) — position:relative + overflow:hidden on
   the section keeps that band strictly clipped to the section's own
   bounds, so it can never bleed into the sections above/below. The
   grid is a separate stacked layer (position:relative + z-index) painted
   above it. Numbers get a neon-style glow via a stacked text-shadow; kept
   deliberately soft (low alpha, moderate blur) so it reads as a subtle
   glow rather than washing out the digits. */
.home-stats-section {
  position: relative;
  margin-top: 64px;
  padding: 20px 24px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}
.home-stats-shape {
  position: absolute;
  inset: 0;
  background: rgba(76, 154, 91, 0.1);
  border: 1px solid rgba(76, 154, 91, 0.18);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16);
  border-radius: inherit;
  pointer-events: none;
}
.home-stats-grid {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}
.home-stat-card {
  flex: 0 1 calc(25% - 12px);
  min-width: 200px;
  text-align: center;
  padding: 8px 20px;
}
.home-stat-value {
  display: block;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--green-dark);
  text-shadow: 0 0 8px rgba(76, 210, 130, 0.55), 0 0 20px rgba(76, 210, 130, 0.3),
    0 0 36px rgba(76, 210, 130, 0.15);
}
.home-stat-label {
  display: block;
  margin-top: 6px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
  text-shadow: var(--shadow-xs);
}

@media (max-width: 480px) {
  .home-stats-section {
    padding: 16px 16px;
  }
}
</style>
