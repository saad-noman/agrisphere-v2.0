<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-top">
        <div>
          <router-link to="/" class="footer-brand">
            <span class="logo-mark">
              <img src="/favicon.png" alt="AgriSphere" />
            </span>
            <span><span class="agri">Agri</span><span class="sphere">Sphere</span></span>
          </router-link>
        </div>

        <div>
          <p class="footer-col-title">{{ t('footer.explore') }}</p>
          <nav class="footer-links">
            <router-link to="/experts">{{ t('nav.experts') }}</router-link>
            <router-link to="/organizations">{{ t('nav.organizations') }}</router-link>
            <router-link to="/map">{{ t('nav.servicesMap') }}</router-link>
            <router-link to="/get-weather">{{ t('nav.weather') }}</router-link>
          </nav>
        </div>

        <div>
          <p class="footer-col-title">{{ t('footer.cropCare') }}</p>
          <nav class="footer-links">
            <router-link to="/crop-intelligence">{{ t('nav.cropIntelligence') }}</router-link>
            <router-link to="/crop-analysis">{{ t('nav.cropDiseaseAnalysis') }}</router-link>
            <router-link to="/disease-library">{{ t('nav.diseaseLibrary') }}</router-link>
            <router-link to="/farming-recommendation">{{ t('nav.cropRecommendation') }}</router-link>
          </nav>
        </div>
      </div>

      <div class="footer-copy">
        <span>{{ t('footer.rights', { year: currentYear }) }}</span>
        <span>{{ t('footer.builtFor') }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { t } from '../i18n';

// Read once at render; a footer year that silently goes stale is a small but
// very visible bug.
const currentYear = new Date().getFullYear();
</script>
