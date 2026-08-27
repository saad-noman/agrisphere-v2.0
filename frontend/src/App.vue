<template>
  <div id="app">
    <Navbar />
    <main class="page-content">
      <router-view />
    </main>
    <Footer />
    <AiAssistantWidget />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import AiAssistantWidget from './components/AiAssistantWidget.vue';
</script>
