const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['expert', 'organization'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One rating per farmer per target — resubmitting updates it instead of duplicating
ratingSchema.index({ farmerId: 1, targetType: 1, targetId: 1 }, { unique: true });
ratingSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
