<template>
  <nav ref="navRef" class="navbar-agri">
    <div class="navbar-row">
      <router-link to="/" class="logo" @click="closeAll">
        🌱 <span class="agri">Agri</span><span class="sphere">Sphere</span>
      </router-link>
      <button
        type="button"
        class="navbar-toggle"
        :aria-expanded="mobileOpen"
        aria-label="Toggle navigation"
        @click="toggleMobile"
      >
        {{ mobileOpen ? '✕' : '☰' }}
      </button>
    </div>

    <div class="nav-links" :class="{ 'nav-links-open': mobileOpen }">
      <router-link to="/" class="btn-pill-outline" @click="closeAll">Home</router-link>
      <router-link to="/get-weather" class="btn-pill-outline" @click="closeAll">Weather</router-link>

      <div class="nav-dropdown">
        <button type="button" class="btn-pill-outline" @click="toggleMenu('directory')">
          Directory {{ openMenu === 'directory' ? '▲' : '▼' }}
        </button>
        <div v-if="openMenu === 'directory'" class="nav-dropdown-menu">
          <router-link to="/experts" @click="closeAll">Agricultural Experts</router-link>
          <router-link to="/organizations" @click="closeAll">Organizations</router-link>
          <router-link to="/map" @click="closeAll">Services Map</router-link>
        </div>
      </div>

      <!-- FARMER NAVIGATION -->
      <template v-if="authState.user?.role === 'farmer'">
        <router-link to="/dashboard" class="btn-pill-outline" @click="closeAll">Dashboard</router-link>

        <div class="nav-dropdown">
          <button type="button" class="btn-pill-outline" @click="toggleMenu('farm')">
            My Farm {{ openMenu === 'farm' ? '▲' : '▼' }}
          </button>
          <div v-if="openMenu === 'farm'" class="nav-dropdown-menu">
            <router-link to="/farm-records" @click="closeAll">Farm Records</router-link>
            <router-link to="/financial-analysis" @click="closeAll">Financial Analysis</router-link>
            <router-link to="/expense-management" @click="closeAll">Manage Expenses</router-link>
            <router-link to="/seasonal-performance" @click="closeAll">Seasonal Performance</router-link>
            <router-link to="/timeline" @click="closeAll">Activity Timeline</router-link>
          </div>
        </div>

        <router-link to="/farming-expertise/request" class="btn-pill-outline" @click="closeAll">
          Farming Expertise
        </router-link>

        <div class="nav-dropdown">
          <button type="button" class="btn-pill-outline" @click="toggleMenu('diagnosis')">
            Diagnosis {{ openMenu === 'diagnosis' ? '▲' : '▼' }}
          </button>
          <div v-if="openMenu === 'diagnosis'" class="nav-dropdown-menu">
            <router-link to="/disease-submission" @click="closeAll">Submit Disease Case</router-link>
            <router-link to="/crop-analysis" @click="closeAll">AI Crop Disease Analysis</router-link>
            <router-link to="/diagnosis-history" @click="closeAll">Diagnosis History</router-link>
          </div>
        </div>

        <div class="nav-dropdown">
          <button type="button" class="btn-pill-outline" @click="toggleMenu('consult')">
            Consultation {{ openMenu === 'consult' ? '▲' : '▼' }}
          </button>
          <div v-if="openMenu === 'consult'" class="nav-dropdown-menu">
            <router-link to="/consultations/request" @click="closeAll">Request Consultation</router-link>
            <router-link to="/consultations" @click="closeAll">My Consultations</router-link>
          </div>
        </div>
      </template>

      <!-- EXPERT NAVIGATION -->
      <template v-else-if="authState.user?.role === 'expert'">
        <router-link to="/farming-expertise/provide" class="btn-pill-outline" @click="closeAll">
          Farming Expertise
        </router-link>

        <div class="nav-dropdown">
          <button type="button" class="btn-pill-outline" @click="toggleMenu('diagnosis')">
            Diagnosis {{ openMenu === 'diagnosis' ? '▲' : '▼' }}
          </button>
          <div v-if="openMenu === 'diagnosis'" class="nav-dropdown-menu">
            <router-link to="/provide-crop-diagnosis-report" @click="closeAll">
              Provide Crop Diagnosis Report
            </router-link>
            <router-link to="/crop-analysis" @click="closeAll">AI Crop Disease Analysis</router-link>
            <router-link to="/disease-library" @click="closeAll">Disease Library</router-link>
            <router-link to="/tag-management" @click="closeAll">Tag Management</router-link>
          </div>
        </div>

        <div class="nav-dropdown">
          <button type="button" class="btn-pill-outline" @click="toggleMenu('consult')">
            Consultation {{ openMenu === 'consult' ? '▲' : '▼' }}
          </button>
          <div v-if="openMenu === 'consult'" class="nav-dropdown-menu">
            <router-link to="/consultations/pending" @click="closeAll">Pending Requests</router-link>
            <router-link to="/consultations/records" @click="closeAll">Consultation Record</router-link>
          </div>
        </div>
      </template>

      <!-- MESSAGES -->
      <router-link
        v-if="authState.user && (authState.user.role === 'farmer' || authState.user.role === 'expert')"
        to="/messages"
        class="btn-pill-outline notif-btn"
        title="Messages"
        @click="closeAll"
      >
        💬<span v-if="unreadMessages" class="notif-badge">{{ unreadMessages }}</span>
      </router-link>

      <!-- NOTIFICATIONS -->
      <div v-if="authState.user" class="nav-dropdown">
        <button type="button" class="btn-pill-outline notif-btn" @click="toggleMenu('notif')">
          🔔<span v-if="unreadCount" class="notif-badge">{{ unreadCount }}</span>
        </button>
        <div v-if="openMenu === 'notif'" class="nav-dropdown-menu nav-dropdown-menu-end notif-menu">
          <p v-if="notifications.length === 0" class="px-2 mb-0">No notifications</p>
          <a
            v-for="n in notifications"
            :key="n._id"
            href="#"
            :class="{ 'fw-bold': !n.isRead }"
            @click.prevent="openNotification(n)"
          >
            {{ n.message }}
          </a>
        </div>
      </div>

      <!-- ACCOUNT -->
      <div v-if="authState.user" class="nav-dropdown">
        <button type="button" class="btn-pill account-btn" @click="toggleMenu('account')">
          Hi, {{ firstName }} {{ openMenu === 'account' ? '▲' : '▼' }}
        </button>
        <div v-if="openMenu === 'account'" class="nav-dropdown-menu nav-dropdown-menu-end">
          <router-link to="/profile-dashboard" @click="closeAll">My Profile</router-link>
          <router-link to="/farming-recommendation" @click="closeAll">Crop Recommendation</router-link>
          <router-link to="/profile" @click="closeAll">Edit Profile</router-link>
          <a href="#" @click.prevent="handleLogout">Logout</a>
        </div>
      </div>

      <template v-else>
        <router-link to="/login" class="btn-pill-outline" @click="closeAll">Login</router-link>
        <router-link to="/register" class="btn-pill" @click="closeAll">Register</router-link>
      </template>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState, logout } from '../stores/auth';
import { getNotifications, markNotificationRead } from '../services/notificationService';
import { getUnreadCount } from '../services/messageService';
import { useClickOutside } from '../composables/useClickOutside';

const router = useRouter();
const navRef = ref(null);
const mobileOpen = ref(false);
const openMenu = ref(null); // which single dropdown is open, or null
const notifications = ref([]);
const unreadCount = ref(0);
const unreadMessages = ref(0);
let messagePoll = null;

const firstName = computed(() => authState.user?.name?.split(' ')[0] || '');

useClickOutside(navRef, () => {
  openMenu.value = null;
});

onMounted(() => {
  if (authState.user) {
    loadNotifications();
    loadUnreadMessages();
    // Light polling keeps the message badge fresh without a socket layer.
    if (authState.user.role === 'farmer' || authState.user.role === 'expert') {
      messagePoll = setInterval(loadUnreadMessages, 15000);
    }
  }
});

onUnmounted(() => {
  if (messagePoll) clearInterval(messagePoll);
});

async function loadUnreadMessages() {
  if (!authState.user) return;
  try {
    const { data } = await getUnreadCount();
    unreadMessages.value = data.unread || 0;
  } catch {
    /* ignore transient errors */
  }
}

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name;
  if (openMenu.value === 'notif') {
    loadNotifications();
  }
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value;
  openMenu.value = null;
}

function closeAll() {
  openMenu.value = null;
  mobileOpen.value = false;
}

async function loadNotifications() {
  try {
    const response = await getNotifications();
    notifications.value = response.data;
    unreadCount.value = notifications.value.filter((n) => !n.isRead).length;
  } catch (err) {
    console.error('Failed to load notifications', err);
  }
}

async function openNotification(notification) {
  closeAll();
  if (!notification.isRead) {
    await markNotificationRead(notification._id);
  }
  if (notification.link) {
    router.push(notification.link);
  }
}

function handleLogout() {
  closeAll();
  logout();
  router.push('/');
}
</script>
