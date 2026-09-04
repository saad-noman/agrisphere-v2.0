const mongoose = require('mongoose');

// Community-reported road problems (waterlogging, blockages, damage).
// These are crowd-sourced reports, not sensor or live-traffic data.
const roadHazardSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['waterlogged', 'flooded', 'blocked', 'damaged', 'construction', 'other'],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    description: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    confirmations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

roadHazardSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('RoadHazard', roadHazardSchema);
