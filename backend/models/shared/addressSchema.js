const mongoose = require('mongoose');

// Shared address shape used by users, experts and organizations.
// `division` (Bangladesh) and `state` (elsewhere) are independent optional
// fields, so a profile only ever fills in the one that applies.
const addressSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true, default: 'Bangladesh' },
    division: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    district: { type: String, trim: true, default: null },
    upazila: { type: String, trim: true, default: null },
    addressLine: { type: String, trim: true, default: null },
  },
  { _id: false }
);

module.exports = addressSchema;
