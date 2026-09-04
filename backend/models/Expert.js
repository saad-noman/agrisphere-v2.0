const mongoose = require('mongoose');
const addressSchema = require('./shared/addressSchema');

const expertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String },
    profileImage: { type: String },
    specialization: { type: String },
    expertiseCategory: { type: String },
    qualification: { type: String },
    bio: { type: String },
    awards: { type: String },
    areasOfExpertise: { type: String },
    researchExperience: { type: String },
    experience: { type: Number },
    organization: { type: String },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    consultationMode: { type: String, enum: ['online', 'offline', 'both'], default: 'both' },
    phone: { type: String },
    email: { type: String },
    address: { type: addressSchema, default: () => ({}) },
    availabilityStatus: { type: String, enum: ['available', 'unavailable'], default: 'available' },

    // Consultation pricing. A fee of 0 (or consultationFeeType 'free')
    // means the expert consults for free.
    consultationFeeType: { type: String, enum: ['free', 'paid'], default: 'free' },
    consultationFee: { type: Number, default: 0, min: 0 },
    consultationFeeNote: { type: String, trim: true, maxlength: 160, default: '' },
    latitude: { type: Number },
    longitude: { type: Number },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expert', expertSchema);
