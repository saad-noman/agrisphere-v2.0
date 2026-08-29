import { reactive, computed } from 'vue';

// Theme preference: 'light' | 'dark' | 'system'. The resolved value is set
// on <html> as data-theme and data-bs-theme so Bootstrap follows along.
const STORAGE_KEY = 'agrisphere-theme';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

export const themeState = reactive({
  preference: readStored(),
  systemDark: media.matches,
});

// The theme actually being displayed right now.
export const resolvedTheme = computed(() =>
  themeState.preference === 'system'
    ? themeState.systemDark
      ? 'dark'
      : 'light'
    : themeState.preference
);

export const isDark = computed(() => resolvedTheme.value === 'dark');

function apply() {
  const theme = resolvedTheme.value;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-bs-theme', theme);
  root.style.colorScheme = theme;
}

export function setTheme(preference) {
  themeState.preference = preference;
  localStorage.setItem(STORAGE_KEY, preference);
  apply();
}

// Flips between light and dark based on what is currently shown
export function toggleTheme() {
  setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark');
}

// Keep 'system' in sync if the OS preference changes while the app is open.
media.addEventListener('change', (e) => {
  themeState.systemDark = e.matches;
  if (themeState.preference === 'system') apply();
});

// Apply immediately on import so there's no flash of the wrong theme.
apply();
