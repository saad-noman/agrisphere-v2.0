const mongoose = require('mongoose');

// Demo wallet ledger. No real payment gateway is involved anywhere — this
// records movements of the seeded demo balance so the consultation payment
// flow can be shown end to end.
const transactionSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, trim: true, default: 'BDT' },
    type: {
      type: String,
      enum: ['consultation_payment', 'consultation_refund', 'top_up'],
      required: true,
    },
    reference: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
    // 'Order' is required for marketplace sales: releasing a completed order's
    // payment writes a ledger entry that points back at the Order.
    referenceModel: { type: String, enum: ['ConsultationRequest', 'Listing', 'Order'] },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'completed',
    },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ from: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
