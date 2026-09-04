const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Friendly name for this crop/field
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Crop species (Rice, Tomato, Potato, etc.)
    cropType: {
      type: String,
      required: true,
      trim: true,
    },

    // Variety (BRRI Dhan-28, Roma, etc.)
    variety: {
      type: String,
      trim: true,
    },

    season: {
      type: String,
      trim: true,
    },

    area: {
      type: Number,
      min: 0,
    },

    areaUnit: {
      type: String,
      default: 'acre',
    },

    // Optional field outline drawn on the map. Crops without one stay valid.
    geoBoundary: {
      type: {
        type: String,
        enum: ['Polygon'],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },

    plantingDate: {
      type: Date,
    },

    expectedHarvestDate: {
      type: Date,
    },

    // Farm/village/field location
    location: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'harvested', 'abandoned'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Crop', cropSchema);
