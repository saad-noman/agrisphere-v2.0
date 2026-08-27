import { onMounted, onBeforeUnmount } from 'vue';

// Calls onOutsideClick() whenever the user clicks outside the element that
// elementRef points to. Used to close dropdowns/menus when clicking away.
export function useClickOutside(elementRef, onOutsideClick) {
  function handleClick(event) {
    if (elementRef.value && !elementRef.value.contains(event.target)) {
      onOutsideClick();
    }
  }

  onMounted(() => document.addEventListener('click', handleClick));
  onBeforeUnmount(() => document.removeEventListener('click', handleClick));
}
