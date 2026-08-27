const mongoose = require('mongoose');

const farmingRecommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    inputs: {
      n: { type: Number, required: true },
      p: { type: Number, required: true },
      k: { type: Number, required: true },
      ph: { type: Number, required: true },
      temperature: { type: Number, required: true },
      humidity: { type: Number, required: true },
      moisture: { type: Number, required: true },
      rainfall: { type: Number, required: true },
    },
    recommendedCrop: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'FarmingRecommendation',
  farmingRecommendationSchema
);
