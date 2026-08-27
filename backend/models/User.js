const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'farmer', 'expert', 'organization_owner'], default: 'farmer' },
    phone: { type: String },
    district: { type: String },
    upazila: { type: String },
    profileImage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
