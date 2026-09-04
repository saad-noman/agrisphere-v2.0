const { DEFAULT_COUNTRY } = require('../data/countries');

const FIELDS = ['country', 'division', 'state', 'district', 'upazila', 'addressLine'];

function cleanValue(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();
  if (!text) return null;

  return text;
}

// Builds a stored address from whatever the client sent. Accepts either a
// nested `address` object or older flat district/upazila fields, so existing
// clients and saved records keep working.
function buildAddress(body = {}) {
  const source = body.address && typeof body.address === 'object' ? body.address : body;

  const address = {};
  for (let i = 0; i < FIELDS.length; i++) {
    const field = FIELDS[i];
    address[field] = cleanValue(source[field]);
  }

  if (!address.country) {
    address.country = DEFAULT_COUNTRY;
  }

  // A profile is either in a Bangladeshi division or a foreign state, never both.
  if (address.country === DEFAULT_COUNTRY) {
    address.state = null;
  } else {
    address.division = null;
  }

  return address;
}

// True when the request actually carried address information
function hasAddressInput(body = {}) {
  if (body.address && typeof body.address === 'object') return true;

  for (let i = 0; i < FIELDS.length; i++) {
    if (body[FIELDS[i]] !== undefined) return true;
  }

  return false;
}

// Joins an address into one readable line, skipping empty parts
function formatAddress(address) {
  if (!address) return '';

  const parts = [
    address.addressLine,
    address.upazila,
    address.district,
    address.division || address.state,
    address.country,
  ];

  const filled = [];
  for (let i = 0; i < parts.length; i++) {
    const value = cleanValue(parts[i]);
    if (value) filled.push(value);
  }

  return filled.join(', ');
}

module.exports = { buildAddress, hasAddressInput, formatAddress, ADDRESS_FIELDS: FIELDS };
