const mongoose = require('mongoose');

const diseaseCaseSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    crop: {
      type: {
        type: String,
        required: true,
      },
      variety: {
        type: String,
      },
      growthStage: {
        type: String,
      },
      age: {
        type: String,
      },
    },

    symptoms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],

    farmingConditions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],

    images: [
      {
        type: String,
      },
    ],

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ['pending', 'under_review', 'diagnosed', 'resolved'],
      default: 'pending',
    },

    // Filled in when an expert diagnoses the case
    diagnosisReport: {
      expert: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      expertName: { type: String },
      diseaseName: { type: String },
      recommendation: { type: String },
      additionalNotes: { type: String },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiseaseCase', diseaseCaseSchema);
