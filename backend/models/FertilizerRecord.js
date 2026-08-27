const mongoose = require('mongoose');

const fertilizerRecordSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: true,
    },

    fertilizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fertilizer',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      default: 'kg',
    },

    applicationDate: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'FertilizerRecord',
  fertilizerRecordSchema
);
