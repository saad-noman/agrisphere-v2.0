const mongoose = require('mongoose');
const addressSchema = require('./shared/addressSchema');

const organizationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    photo: { type: String },
    category: { type: String },
    description: { type: String },
    address: { type: addressSchema, default: () => ({}) },
    latitude: { type: Number },
    longitude: { type: Number },
    contactNumber: { type: String },
    email: { type: String },
    website: { type: String },
    openingHours: { type: String },
    isConsultationCenter: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
