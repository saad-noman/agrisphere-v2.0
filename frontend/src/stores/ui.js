import { reactive } from 'vue';

// Shared UI state that a couple of unrelated components need to agree on.
// Right now that's just the left navigation drawer: the trigger lives in the
// Navbar (next to the logo) while the drawer itself is mounted at the app
// root, so they coordinate through this small reactive store instead of a
// tangle of props/emits.
export const uiState = reactive({
  drawerOpen: false,
});

export function openDrawer() {
  uiState.drawerOpen = true;
}

export function closeDrawer() {
  uiState.drawerOpen = false;
}

export function toggleDrawer() {
  uiState.drawerOpen = !uiState.drawerOpen;
}
