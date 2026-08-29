<template>
  <nav ref="navRef" class="navbar-agri">
    <!-- LEFT: drawer trigger + brand -->
    <div class="navbar-brand-group">
      <button
        type="button"
        class="nav-ghost-btn"
        aria-label="Open account menu"
        title="Account menu"
        @click="openDrawer"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <router-link to="/" class="logo" @click="closeAll">
        <span class="logo-mark">
          <img src="/favicon.png" alt="AgriSphere Logo" />
        </span>
        <span class="logo-text"><span class="agri">Agri</span><span class="sphere">Sphere</span></span>
      </router-link>
    </div>

    <!-- Primary navigation and action rail. Collapses behind the toggle
         when the viewport is too narrow. -->
    <div class="navbar-right" :class="{ 'navbar-right-open': mobileOpen }">
      <div class="nav-primary">
        <!-- Single links first, then the dropdown menus -->
        <router-link to="/" class="nav-item" @click="closeAll">Home</router-link>
        <router-link
          v-if="authState.user?.role === 'farmer'"
          to="/dashboard"
          class="nav-item"
          @click="closeAll"
        >Dashboard</router-link>

        <!-- FARMER -->
        <template v-if="authState.user?.role === 'farmer'">
          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'farm' }"
              @click="toggleMenu('farm')"
            >
              My Farm
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'farm'" class="nav-dropdown-menu">
              <router-link to="/farm-records" @click="closeAll">Farm Records</router-link>
              <router-link to="/financial-analysis" @click="closeAll">Financial Analysis</router-link>
              <router-link to="/expense-management" @click="closeAll">Manage Expenses</router-link>
              <router-link to="/price-planner" @click="closeAll">Price Planner</router-link>
              <router-link to="/seasonal-performance" @click="closeAll">Seasonal Performance</router-link>
              <router-link to="/timeline" @click="closeAll">Activity Timeline</router-link>
            </div>
          </div>

          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'cropcare' }"
              @click="toggleMenu('cropcare')"
            >
              Crop Care
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'cropcare'" class="nav-dropdown-menu">
              <router-link to="/farming-expertise/request" @click="closeAll">Farming Expertise</router-link>
              <router-link to="/disease-submission" @click="closeAll">Submit Disease Case</router-link>
              <router-link to="/crop-analysis" @click="closeAll">AI Crop Disease Analysis</router-link>
              <router-link to="/diagnosis-history" @click="closeAll">Diagnosis History</router-link>
              <router-link to="/farming-recommendation" @click="closeAll">Crop Recommendation</router-link>
            </div>
          </div>

          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'consult' }"
              @click="toggleMenu('consult')"
            >
              Consultation
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'consult'" class="nav-dropdown-menu">
              <router-link to="/consultations/request" @click="closeAll">Request Consultation</router-link>
              <router-link to="/consultations" @click="closeAll">My Consultations</router-link>
            </div>
          </div>
        </template>

        <!-- EXPERT -->
        <template v-else-if="authState.user?.role === 'expert'">
          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'expertise' }"
              @click="toggleMenu('expertise')"
            >
              Expertise
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'expertise'" class="nav-dropdown-menu">
              <router-link to="/farming-expertise/provide" @click="closeAll">Provide Farming Expertise</router-link>
              <router-link to="/provide-crop-diagnosis-report" @click="closeAll">Provide Diagnosis Report</router-link>
              <router-link to="/crop-analysis" @click="closeAll">AI Crop Disease Analysis</router-link>
              <router-link to="/disease-library" @click="closeAll">Disease Library</router-link>
              <router-link to="/tag-management" @click="closeAll">Tag Management</router-link>
              <router-link to="/farming-recommendation" @click="closeAll">Crop Recommendation</router-link>
            </div>
          </div>

          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'consult' }"
              @click="toggleMenu('consult')"
            >
              Consultation
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'consult'" class="nav-dropdown-menu">
              <router-link to="/consultations/pending" @click="closeAll">Pending Requests</router-link>
              <router-link to="/consultations/records" @click="closeAll">Consultation Record</router-link>
            </div>
          </div>
        </template>

        <!-- ORGANIZATION OWNER -->
        <template v-else-if="authState.user?.role === 'organization_owner'">
          <div class="nav-dropdown">
            <button
              type="button"
              class="nav-item nav-item-toggle"
              :class="{ 'nav-item-active': openMenu === 'myorgs' }"
              @click="toggleMenu('myorgs')"
            >
              My Organizations
              <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div v-if="openMenu === 'myorgs'" class="nav-dropdown-menu">
              <router-link to="/organizations/mine" @click="closeAll">My Organizations</router-link>
              <router-link to="/organizations/new" @click="closeAll">Add Organization</router-link>
            </div>
          </div>
        </template>

        <div class="nav-dropdown">
          <button
            type="button"
            class="nav-item nav-item-toggle"
            :class="{ 'nav-item-active': openMenu === 'explore' }"
            @click="toggleMenu('explore')"
          >
            Explore
            <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openMenu === 'explore'" class="nav-dropdown-menu">
            <router-link to="/experts" @click="closeAll">Agricultural Experts</router-link>
            <router-link to="/organizations" @click="closeAll">Organizations</router-link>
            <router-link to="/community" @click="closeAll">Community Hub</router-link>
            <router-link to="/map" @click="closeAll">Services Map</router-link>
            <router-link to="/get-weather" @click="closeAll">Weather</router-link>
          </div>
        </div>
      </div>

      <!-- Action rail: utilities, visually separated from navigation -->
      <div class="nav-actions">
        <span class="nav-divider" aria-hidden="true"></span>

        <!-- Theme switch -->
        <button
          type="button"
          class="nav-ghost-btn"
          :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>

        <!-- Messages -->
        <router-link
          v-if="canMessage"
          to="/messages"
          class="nav-ghost-btn nav-badge-host"
          title="Messages"
          aria-label="Messages"
          @click="closeAll"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z" />
          </svg>
          <span v-if="unreadMessages" class="nav-badge">{{ unreadMessages > 9 ? '9+' : unreadMessages }}</span>
        </router-link>

        <!-- Notifications -->
        <div v-if="authState.user" class="nav-dropdown">
          <button
            type="button"
            class="nav-ghost-btn nav-badge-host"
            title="Notifications"
            aria-label="Notifications"
            @click="toggleMenu('notif')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span v-if="unreadCount" class="nav-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>
          <div v-if="openMenu === 'notif'" class="nav-dropdown-menu nav-dropdown-menu-end notif-menu">
            <p class="nav-menu-heading">Notifications</p>
            <p v-if="notifications.length === 0" class="notif-empty">You're all caught up.</p>
            <a
              v-for="n in notifications"
              :key="n._id"
              href="#"
              :class="{ 'notif-unread': !n.isRead }"
              @click.prevent="openNotification(n)"
            >
              {{ n.message }}
            </a>
          </div>
        </div>

        <!-- Account -->
        <div v-if="authState.user" class="nav-dropdown">
          <button
            type="button"
            class="nav-account-btn"
            :class="{ 'nav-item-active': openMenu === 'account' }"
            aria-label="Account menu"
            @click="toggleMenu('account')"
          >
            <span class="nav-avatar">
              <img v-if="photoUrl" :src="photoUrl" alt="" />
              <span v-else>{{ initials }}</span>
            </span>
            <span class="nav-account-name">{{ firstName }}</span>
            <svg class="nav-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="openMenu === 'account'" class="nav-dropdown-menu nav-dropdown-menu-end">
            <div class="nav-menu-user">
              <div class="nav-menu-user-name">{{ authState.user.name }}</div>
              <div class="nav-menu-user-role">{{ roleLabel }}</div>
            </div>
            <router-link to="/profile-dashboard" @click="closeAll">My Profile</router-link>
            <router-link to="/profile" @click="closeAll">Edit Profile</router-link>
            <a href="#" class="nav-menu-danger" @click.prevent="handleLogout">Logout</a>
          </div>
        </div>

        <template v-else>
          <router-link to="/login" class="btn-pill-outline btn-pill-sm" @click="closeAll">Login</router-link>
          <router-link to="/register" class="btn-pill btn-pill-sm" @click="closeAll">Register</router-link>
        </template>
      </div>
    </div>

    <!-- Collapse toggle, shown when the rail cannot fit -->
    <button
      type="button"
      class="navbar-toggle"
      :aria-expanded="mobileOpen"
      aria-label="Toggle navigation"
      @click="toggleMobile"
    >
      <svg v-if="!mobileOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  </nav>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState, logout } from '../stores/auth';
import { openDrawer } from '../stores/ui';
import { isDark, toggleTheme } from '../stores/theme';
import { getNotifications, markNotificationRead } from '../services/notificationService';
import { getUnreadCount } from '../services/messageService';
import { getProfile } from '../services/profileService';
import { serverUrl } from '../services/api';
import { useClickOutside } from '../composables/useClickOutside';

const router = useRouter();
const navRef = ref(null);
const mobileOpen = ref(false);
const openMenu = ref(null); // which single dropdown is open, or null
const notifications = ref([]);
const unreadCount = ref(0);
const unreadMessages = ref(0);
const profileImage = ref(authState.user?.profileImage || '');
let messagePoll = null;

const firstName = computed(() => authState.user?.name?.split(' ')[0] || '');
const photoUrl = computed(() => (profileImage.value ? serverUrl + profileImage.value : ''));
const initials = computed(() => {
  const parts = (authState.user?.name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
});

const ROLE_LABELS = {
  farmer: 'Farmer',
  expert: 'Agricultural Expert',
  organization_owner: 'Organization Owner',
  admin: 'Administrator',
};
const roleLabel = computed(() => ROLE_LABELS[authState.user?.role] || authState.user?.role || '');

const canMessage = computed(
  () =>
    authState.user &&
    (authState.user.role === 'farmer' || authState.user.role === 'expert')
);

useClickOutside(navRef, () => {
  openMenu.value = null;
});

// The navbar stays mounted for the whole session, so these watchers keep the
// avatar in step with photo changes made elsewhere in the app.
watch(
  () => authState.user?.profileImage,
  (value) => {
    profileImage.value = value || '';
  }
);
// Switching accounts clears the avatar first, then loads the new user's photo
watch(
  () => authState.token,
  () => {
    profileImage.value = '';
    if (authState.user) loadPhoto();
  }
);

onMounted(() => {
  if (authState.user) {
    loadNotifications();
    loadUnreadMessages();
    loadPhoto();
    // Polling keeps the message badge fresh
    if (canMessage.value) {
      messagePoll = setInterval(loadUnreadMessages, 15000);
    }
  }
});

onUnmounted(() => {
  if (messagePoll) clearInterval(messagePoll);
});

async function loadPhoto() {
  try {
    const { data } = await getProfile();
    if (data?.user?.profileImage) profileImage.value = data.user.profileImage;
  } catch {
    /* avatar falls back to initials */
  }
}

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
