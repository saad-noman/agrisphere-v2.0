<template>
  <div id="app">
    <!-- Keyboard users can jump past the whole navigation in one tab press. -->
    <a class="skip-link" href="#main">{{ t('common.skipToContent') }}</a>
    <Navbar />
    <AppDrawer />
    <main id="main" class="page-content" tabindex="-1">
      <router-view />
    </main>
    <Footer />
    <MessageLauncher />
    <AiAssistantWidget />
    <ConfirmDialog />
    <ToastHost />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import AppDrawer from './components/AppDrawer.vue';
import Footer from './components/Footer.vue';
import MessageLauncher from './components/MessageLauncher.vue';
import AiAssistantWidget from './components/AiAssistantWidget.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastHost from './components/ToastHost.vue';
import { t } from './i18n';
</script>
