const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Expert = require('../models/Expert');
const Rating = require('../models/Rating');
const RoadHazard = require('../models/RoadHazard');
const { recalculateAggregate } = require('./ratingController');
const sendError = require('../utils/sendError');
const { buildAddress } = require('../utils/address');

// To best-effort delete an uploaded file
const deleteUploadedFile = (imagePath) => {
  if (!imagePath) return;
  fs.unlink(path.join('uploads', path.basename(imagePath)), () => {});
};

// GET /api/users/me
// To get the logged-in user's profile (with their Expert profile too, if applicable)
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    let expert = null;

    if (user.role === 'expert') {
      expert = await Expert.findOne({ userId: user._id });
    }

    res.json({ user, expert });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// Builds the user fields a profile save may change
function buildUserUpdate(body, role, name, phone, address) {
  const update = { name, phone, address };

  if (role === 'farmer' && body.isPublic !== undefined) {
    update.isPublic = Boolean(body.isPublic);
  }

  return update;
}

// PUT /api/users/me
// To update the logged-in user's profile (and their linked Expert profile, if applicable)
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const address = buildAddress(req.body);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      // Only farmers can list themselves publicly in the marketplace
      buildUserUpdate(req.body, req.user.role, name, phone, address),
      { new: true }
    ).select('-password');

    let expert = null;

    if (user.role === 'expert') {
      const {
        specialization,
        expertiseCategory,
        qualification,
        bio,
        awards,
        areasOfExpertise,
        researchExperience,
        experience,
        organization,
        organizationId,
        consultationMode,
        availabilityStatus,
        consultationFeeType,
        consultationFee,
        consultationFeeNote,
        latitude,
        longitude,
      } = req.body;

      // A free consultation always stores a zero fee, so the two fields
      // can never disagree.
      const feeType = consultationFeeType === 'paid' ? 'paid' : 'free';
      let feeAmount = Number(consultationFee);
      if (!Number.isFinite(feeAmount) || feeAmount < 0 || feeType === 'free') feeAmount = 0;

      expert = await Expert.findOneAndUpdate(
        { userId: user._id },
        {
          fullName: name,
          phone,
          address,
          specialization,
          expertiseCategory,
          qualification,
          bio,
          awards,
          areasOfExpertise,
          researchExperience,
          experience,
          organization,
          organizationId: organizationId || null,
          consultationMode,
          address,
          availabilityStatus,
          consultationFeeType: feeType,
          consultationFee: feeAmount,
          consultationFeeNote: String(consultationFeeNote || '').slice(0, 160),
          latitude,
          longitude,
        },
        { new: true, upsert: true }
      );
    }

    res.json({ user, expert });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// POST /api/users/me/photo
// To upload and save the logged-in user's profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imagePath },
      { new: true }
    ).select('-password');

    if (user.role === 'expert') {
      await Expert.findOneAndUpdate({ userId: user._id }, { profileImage: imagePath });
    }

    res.json({ user });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// DELETE /api/users/me/photo
// To remove the logged-in user's profile photo
const deleteProfilePhoto = async (req, res) => {
  try {
    deleteUploadedFile(req.user.profileImage);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: null },
      { new: true }
    ).select('-password');

    if (user.role === 'expert') {
      await Expert.findOneAndUpdate({ userId: user._id }, { profileImage: null });
    }

    res.json({ user });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// DELETE /api/users/me
// To delete the logged-in user's account and all their related data
const deleteProfile = async (req, res) => {
  try {
    if (req.user.role === 'expert') {
      const expert = await Expert.findOneAndDelete({ userId: req.user._id });
      if (expert) {
        await Rating.deleteMany({ targetType: 'expert', targetId: expert._id });
      }
    }

    const authoredRatings = await Rating.find({ farmerId: req.user._id }, 'targetType targetId').lean();
    await Rating.deleteMany({ farmerId: req.user._id });
    for (const { targetType, targetId } of authoredRatings) {
      await recalculateAggregate(targetType, targetId);
    }

    deleteUploadedFile(req.user.profileImage);
    await User.findByIdAndDelete(req.user._id);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};


// PATCH /api/users/change-password
// Available to every signed-in role
const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!currentPassword) {
      return res.status(400).json({ field: 'currentPassword', message: 'Please enter your current password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ field: 'newPassword', message: 'New password must be at least 6 characters' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ field: 'confirmPassword', message: 'The two passwords do not match' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // Field-scoped so the UI can point at the right input
      return res.status(400).json({ field: 'currentPassword', message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to update the password', err);
  }
};


// GET /api/users/admin/stats
// Counts by role plus recent hazard reports, for the admin dashboard
const getAdminStats = async (req, res) => {
  try {
    const roles = ['farmer', 'expert', 'organization_owner', 'market', 'admin'];
    const counts = {};

    for (let i = 0; i < roles.length; i++) {
      counts[roles[i]] = await User.countDocuments({ role: roles[i] });
    }

    const totalUsers = await User.countDocuments({});

    const hazards = await RoadHazard.find({ status: 'active' })
      .populate('reporter', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentHazards = [];
    for (let i = 0; i < hazards.length; i++) {
      recentHazards.push({
        _id: hazards[i]._id,
        type: hazards[i].type,
        severity: hazards[i].severity,
        description: hazards[i].description || '',
        reporterName: hazards[i].reporter ? hazards[i].reporter.name : '',
        createdAt: hazards[i].createdAt,
      });
    }

    res.json({ counts, totalUsers, recentHazards });
  } catch (err) {
    sendError(res, 500, 'Failed to load admin statistics', err);
  }
};

module.exports = {
  getAdminStats,
  changePassword, getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto, deleteProfile };
