import { reactive } from 'vue';

// Shared UI state. The drawer trigger and the drawer itself live in
// different components, so they coordinate through this store.
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
