const mongoose = require('mongoose');

// A line item in a price plan. `unitPrice` stores the price used at save
// time, so saved plans keep their historical costing until refreshed.
const pricePlanItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      enum: ['seed', 'fertilizer', 'pesticide', 'other'],
      default: 'other',
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, maxlength: 24, default: 'unit' },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },

    // Where this line's price came from
    priceSource: {
      type: String,
      enum: ['live', 'manual'],
      default: 'manual',
    },
    priceSymbol: { type: String, trim: true, default: null },
    priceCurrency: { type: String, trim: true, default: 'USD' },
    priceRetrievedAt: { type: Date, default: null },
  },
  { _id: true }
);

const pricePlanSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    items: {
      type: [pricePlanItemSchema],
      default: [],
    },
    grandTotal: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, trim: true, default: 'USD' },

    // When live prices were last pulled in
    pricesUpdatedAt: { type: Date, default: null },
    priceSourceName: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

pricePlanSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('PricePlan', pricePlanSchema);
