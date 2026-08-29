<template>
  <teleport to="body">
    <!-- Backdrop -->
    <transition name="drawer-fade">
      <div
        v-if="uiState.drawerOpen"
        class="app-drawer-backdrop"
        @click="closeDrawer"
      ></div>
    </transition>

    <!-- Drawer holds account, appearance and session. Feature navigation
         lives in the navbar. -->
    <transition name="drawer-slide">
      <aside
        v-if="uiState.drawerOpen"
        class="app-drawer"
        role="dialog"
        aria-label="Account menu"
      >
        <!-- Identity header -->
        <header class="app-drawer-header">
          <button
            type="button"
            class="app-drawer-close"
            aria-label="Close menu"
            @click="closeDrawer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <!-- Avatar is only rendered for a signed-in user -->
          <div v-if="authState.user" class="drawer-avatar">
            <img v-if="photoUrl" :src="photoUrl" alt="Profile photo" />
            <!-- Clean person silhouette when the user has no photo -->
            <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-3.31-3.58-6-8-6Z" />
            </svg>
          </div>

          <template v-if="authState.user">
            <div class="drawer-user-name">{{ authState.user.name }}</div>
            <div class="drawer-user-role">{{ roleLabel }}</div>
            <div v-if="authState.user.email" class="drawer-user-meta">
              {{ authState.user.email }}
            </div>
          </template>
          <template v-else>
            <div class="drawer-user-name">Welcome to AgriSphere</div>
            <div class="drawer-user-role">Grow smarter, together</div>
            <div class="drawer-guest-actions">
              <router-link to="/login" class="btn-pill-outline btn-pill-sm" @click="closeDrawer">Login</router-link>
              <router-link to="/register" class="btn-pill btn-pill-sm" @click="closeDrawer">Register</router-link>
            </div>
          </template>
        </header>

        <div class="app-drawer-body">
          <!-- Account destinations (not present in the navbar's nav groups) -->
          <nav v-if="authState.user" class="drawer-section">
            <p class="drawer-section-title">Account</p>
            <router-link to="/profile-dashboard" class="drawer-link" @click="closeDrawer">
              <span class="drawer-link-icon" v-html="icon('user')"></span>
              <span>My Profile</span>
            </router-link>
            <router-link to="/profile" class="drawer-link" @click="closeDrawer">
              <span class="drawer-link-icon" v-html="icon('settings')"></span>
              <span>Edit Profile</span>
            </router-link>
            <router-link
              v-if="canMessage"
              to="/messages"
              class="drawer-link"
              @click="closeDrawer"
            >
              <span class="drawer-link-icon" v-html="icon('message')"></span>
              <span>Messages</span>
              <span v-if="unreadMessages" class="drawer-link-badge">{{ unreadMessages }}</span>
            </router-link>
          </nav>

          <!-- Appearance: full control over the theme preference -->
          <div class="drawer-section">
            <p class="drawer-section-title">Appearance</p>
            <div class="theme-segmented" role="group" aria-label="Theme preference">
              <button
                v-for="opt in themeOptions"
                :key="opt.value"
                type="button"
                class="theme-seg-btn"
                :class="{ 'theme-seg-active': themeState.preference === opt.value }"
                :aria-pressed="themeState.preference === opt.value"
                @click="setTheme(opt.value)"
              >
                <span class="theme-seg-icon" v-html="icon(opt.icon)"></span>
                <span>{{ opt.label }}</span>
              </button>
            </div>
            <p class="drawer-hint">
              {{ themeState.preference === 'system'
                ? `Following your device (${resolvedTheme})`
                : `Always ${themeState.preference}` }}
            </p>
          </div>

        </div>

        <footer v-if="authState.user" class="app-drawer-footer">
          <button type="button" class="btn-pill-danger drawer-logout" @click="handleLogout">
            <span class="drawer-link-icon" v-html="icon('logout')"></span>
            Logout
          </button>
        </footer>
      </aside>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { authState, logout } from '../stores/auth';
import { uiState, closeDrawer } from '../stores/ui';
import { themeState, setTheme, resolvedTheme } from '../stores/theme';
import { getProfile } from '../services/profileService';
import { getUnreadCount } from '../services/messageService';
import { serverUrl } from '../services/api';

const router = useRouter();
const profileImage = ref(authState.user?.profileImage || '');
const unreadMessages = ref(0);

const photoUrl = computed(() =>
  profileImage.value ? serverUrl + profileImage.value : ''
);

const ROLE_LABELS = {
  farmer: 'Farmer',
  expert: 'Agricultural Expert',
  organization_owner: 'Organization Owner',
  admin: 'Administrator',
};
const roleLabel = computed(
  () => ROLE_LABELS[authState.user?.role] || authState.user?.role || ''
);

const canMessage = computed(
  () =>
    !!authState.user &&
    (authState.user.role === 'farmer' || authState.user.role === 'expert')
);

const themeOptions = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'device' },
];

// --- Inline icon set -----------------------------------------------------
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.3L14 3h-4l-.3 2.1a7 7 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.3L10 21h4l.3-2.1a7 7 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.06-.43.1-.86.1-1.3Z"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/>',
  logout:
    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h10"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  device:
    '<rect x="2.5" y="4" width="19" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
};

function icon(name) {
  const inner = ICONS[name] || ICONS.user;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

async function loadProfileExtras() {
  if (!authState.user) return;
  // Loads the avatar and unread count; failures are non-blocking
  try {
    const { data } = await getProfile();
    if (data?.user?.profileImage) profileImage.value = data.user.profileImage;
  } catch {
    /* ignore */
  }
  try {
    if (canMessage.value) {
      const { data } = await getUnreadCount();
      unreadMessages.value = data.unread || 0;
    }
  } catch {
    /* ignore */
  }
}

onMounted(loadProfileExtras);

watch(
  () => uiState.drawerOpen,
  (open) => {
    if (open) loadProfileExtras();
    // Lock body scroll while the drawer is open.
    document.body.style.overflow = open ? 'hidden' : '';
  }
);

watch(
  () => authState.token,
  () => {
    profileImage.value = authState.user?.profileImage || '';
    unreadMessages.value = 0;
  }
);

function handleLogout() {
  closeDrawer();
  logout();
  router.push('/');
}
</script>
