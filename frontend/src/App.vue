<template>
  <div id="app">
    <Navbar />
    <AppDrawer />
    <main class="page-content">
      <router-view />
    </main>
    <Footer />
    <MessageLauncher />
    <AiAssistantWidget />
    <ConfirmDialog />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import AppDrawer from './components/AppDrawer.vue';
import Footer from './components/Footer.vue';
import MessageLauncher from './components/MessageLauncher.vue';
import AiAssistantWidget from './components/AiAssistantWidget.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
</script>
