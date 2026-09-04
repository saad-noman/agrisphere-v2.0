const mongoose = require('mongoose');
const addressSchema = require('./shared/addressSchema');

// A farmer's produce listing. This is a noticeboard entry only — there is no
// payment or checkout anywhere in the flow.
const listingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Crops from farmers; seeds/pesticides/fertilizer from organizations
    category: { type: String, enum: ['crop','seed','pesticide','fertilizer','equipment','other'], default: 'crop' },
    cropType: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, maxlength: 24, default: 'kg' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, maxlength: 8, default: 'BDT' },
    address: { type: addressSchema, default: () => ({}) },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    photo: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    // Organizations that have expressed buying interest
    interestedOrgs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    description: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

listingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Listing', listingSchema);
