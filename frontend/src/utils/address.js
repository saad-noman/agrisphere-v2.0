// Joins an address object into one readable line, skipping empty parts so a
// missing field never leaves a stray comma.
export function formatAddress(address) {
  if (!address) return '';

  // Older records stored a plain string address
  if (typeof address === 'string') return address.trim();

  const parts = [
    address.addressLine,
    address.upazila,
    address.district,
    address.division || address.state,
    address.country,
  ];

  const filled = [];

  for (let i = 0; i < parts.length; i++) {
    const value = parts[i];
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) filled.push(text);
  }

  return filled.join(', ');
}

// A short label for cards and list rows: just the place, no street line
export function formatShortAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address.trim();

  return formatAddress({
    upazila: address.upazila,
    district: address.district,
    division: address.division,
    state: address.state,
    country: address.country,
  });
}

// An empty address ready for a new form
export function emptyAddress(defaultCountry = 'Bangladesh') {
  return {
    country: defaultCountry,
    division: '',
    state: '',
    district: '',
    upazila: '',
    addressLine: '',
  };
}

// Normalizes whatever the API returned into a complete form-ready object
export function toAddressForm(address, defaultCountry = 'Bangladesh') {
  const base = emptyAddress(defaultCountry);
  if (!address) return base;

  if (typeof address === 'string') {
    base.addressLine = address;
    return base;
  }

  const keys = Object.keys(base);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (address[key]) {
      base[key] = address[key];
    }
  }

  if (!base.country) base.country = defaultCountry;

  return base;
}
