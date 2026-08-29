<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-top">
        <div>
          <router-link to="/" class="footer-brand">
            <span class="logo-mark">
              <img src="/favicon.png" alt="AgriSphere Logo" />
            </span>
            <span><span class="agri">Agri</span><span class="sphere">Sphere</span></span>
          </router-link>
        </div>

        <div>
          <p class="footer-col-title">Explore</p>
          <nav class="footer-links">
            <router-link to="/experts">Agricultural Experts</router-link>
            <router-link to="/organizations">Organizations</router-link>
            <router-link to="/map">Services Map</router-link>
            <router-link to="/get-weather">Weather</router-link>
          </nav>
        </div>

        <div>
          <p class="footer-col-title">Crop Care</p>
          <nav class="footer-links">
            <router-link to="/crop-analysis">AI Disease Analysis</router-link>
            <router-link to="/disease-library">Disease Library</router-link>
            <router-link to="/farming-recommendation">Crop Recommendation</router-link>
          </nav>
        </div>
      </div>

      <div class="footer-copy">
        <span>© 2026 AgriSphere. All rights reserved.</span>
        <span>Built for farmers, experts and agricultural organizations.</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
</script>
