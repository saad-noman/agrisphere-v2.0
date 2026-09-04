// Escapes user-supplied text before it is placed into raw HTML, such as
// Leaflet popup content. Leaflet renders popup strings as HTML, so any
// user-editable value must pass through here first.
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
