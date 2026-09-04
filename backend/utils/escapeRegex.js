// Escapes a user-supplied string so it can be used inside a MongoDB $regex
// without being interpreted as a pattern. Without this a search for "g(" is an
// invalid expression and the whole query throws.
function escapeRegex(value) {
  return String(value == null ? '' : value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
