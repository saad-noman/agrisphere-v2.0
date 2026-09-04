const mongoose = require('mongoose');
const addressSchema = require('./shared/addressSchema');

// A demo purchase. Money moves inside the app's demo wallet only; the
// "courier" is a simulated third party used to show the delivery flow.
const orderSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    cropType: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: 'kg' },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, default: 'BDT' },

    // Where the goods start from. Copied off the listing at checkout so the
    // delivery can still be replayed after the listing itself is removed.
    pickupLatitude: { type: Number, default: null },
    pickupLongitude: { type: Number, default: null },

    // Where the buyer wants it delivered
    deliveryAddress: { type: addressSchema, default: () => ({}) },
    deliveryLatitude: { type: Number, default: null },
    deliveryLongitude: { type: Number, default: null },
    deliveryNote: { type: String, trim: true, maxlength: 300, default: '' },

    // Single source of truth for where the order is in its lifecycle.
    // pending -> confirmed -> ready -> delivering -> delivered -> completed
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'ready', 'delivering', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
    },

    // Money is taken from the buyer at checkout and held until the buyer
    // confirms receipt, at which point it is released to the seller.
    paymentStatus: {
      type: String,
      enum: ['held', 'released', 'refunded'],
      default: 'held',
    },

    // Timeline stamps, so the UI can show what already happened
    confirmedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    deliveryStartedAt: { type: Date, default: null },
    receiptConfirmedAt: { type: Date, default: null },
    paymentReleasedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    courierName: { type: String, trim: true, default: 'AgriSphere Courier (demo)' },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
