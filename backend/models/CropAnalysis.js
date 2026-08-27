const mongoose = require('mongoose');

// Stores a user's AI crop disease detection results
const cropAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['identify', 'disease'], required: true },
    image: { type: String },
    label: { type: String },
    scientificName: { type: String },
    crop: { type: String },
    confidence: { type: Number },
    lowConfidence: { type: Boolean, default: false },
    modelUsed: { type: String },
    alternatives: [
      {
        label: { type: String },
        confidence: { type: Number },
      },
    ],
    report: { type: mongoose.Schema.Types.Mixed },
    reportSource: { type: String, enum: ['llm', 'knowledge-base'], default: 'knowledge-base' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CropAnalysis', cropAnalysisSchema);
