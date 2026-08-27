const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
    },

    cropType: {
      type: String,
    },

    title: {
      type: String,
    },

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'dismissed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Recommendation',
  recommendationSchema
);
