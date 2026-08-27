const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Expert = require('../models/Expert');
const Rating = require('../models/Rating');
const { recalculateAggregate } = require('./ratingController');
const sendError = require('../utils/sendError');

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

// PUT /api/users/me
// To update the logged-in user's profile (and their linked Expert profile, if applicable)
const updateProfile = async (req, res) => {
  try {
    const { name, phone, district, upazila } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, district, upazila },
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
        address,
        availabilityStatus,
        latitude,
        longitude,
      } = req.body;

      expert = await Expert.findOneAndUpdate(
        { userId: user._id },
        {
          fullName: name,
          phone,
          district,
          upazila,
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

module.exports = { getProfile, updateProfile, uploadProfilePhoto, deleteProfilePhoto, deleteProfile };
