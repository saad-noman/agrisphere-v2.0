const mongoose = require('mongoose');

const productionRecordSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      default: 'kg',
    },

    harvestDate: {
      type: Date,
      required: true,
    },

    quality: {
      type: String,
    },

    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'ProductionRecord',
  productionRecordSchema
);
