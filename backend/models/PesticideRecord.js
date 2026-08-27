const mongoose = require('mongoose');

const pesticideRecordSchema = new mongoose.Schema(
  {
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: true,
    },

    pesticide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pesticide',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      default: 'L',
    },

    applicationDate: {
      type: Date,
      required: true,
    },

    targetPest: {
      type: String,
      trim: true,
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
  'PesticideRecord',
  pesticideRecordSchema
);
