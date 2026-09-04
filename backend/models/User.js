const mongoose = require('mongoose');
const addressSchema = require('./shared/addressSchema');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'farmer', 'expert', 'organization_owner', 'market'], default: 'farmer' },
    phone: { type: String },
    address: { type: addressSchema, default: () => ({}) },

    // Farmers opt in before their profile is discoverable in the marketplace
    isPublic: { type: Boolean, default: false },

    // Demo wallet. Not a real payment balance — see transactionController.
    walletBalance: { type: Number, default: 500, min: 0 },
    profileImage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
