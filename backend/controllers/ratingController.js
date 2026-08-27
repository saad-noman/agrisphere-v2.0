const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const Expert = require('../models/Expert');
const Organization = require('../models/Organization');
const Appointment = require('../models/Appointment');
const sendError = require('../utils/sendError');

const TARGET_MODELS = { expert: Expert, organization: Organization };

// To recompute and save an expert's/organization's average rating and review count
async function recalculateAggregate(targetType, targetId) {
  const [stats] = await Rating.aggregate([
    { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
    { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);

  const ratingAverage = stats ? Math.round(stats.avg * 10) / 10 : 0;
  const ratingCount = stats ? stats.count : 0;

  await TARGET_MODELS[targetType].findByIdAndUpdate(targetId, { ratingAverage, ratingCount });
  return { ratingAverage, ratingCount };
}

// To check if a farmer is allowed to rate a target (experts require a completed consultation)
async function checkEligibility(targetType, targetId, farmerId) {
  if (targetType !== 'expert') return true;
  return Appointment.exists({ farmerId, expertId: targetId, status: 'completed' });
}

// GET /api/ratings
// To get a target's average rating, review count and recent reviews
const getRatings = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;

    if (!TARGET_MODELS[targetType] || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'A valid targetType and targetId are required' });
    }

    const ratings = await Rating.find({ targetType, targetId })
      .populate('farmerId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const [stats] = await Rating.aggregate([
      { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
      { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
    ]);

    res.json({
      average: stats ? Math.round(stats.avg * 10) / 10 : 0,
      count: stats ? stats.count : 0,
      ratings,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load ratings', err);
  }
};

// GET /api/ratings/mine
// To get the logged-in farmer's own rating for a target, and their eligibility to rate it
const getMyRating = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;

    if (!TARGET_MODELS[targetType] || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'A valid targetType and targetId are required' });
    }

    const [rating, eligible] = await Promise.all([
      Rating.findOne({ farmerId: req.user._id, targetType, targetId }),
      checkEligibility(targetType, targetId, req.user._id),
    ]);

    res.json({ rating, eligible: Boolean(eligible) });
  } catch (err) {
    sendError(res, 500, 'Failed to load your rating', err);
  }
};

// POST /api/ratings
// To create or update the logged-in farmer's rating for an expert/organization
const submitRating = async (req, res) => {
  try {
    const { targetType, targetId, comment } = req.body;
    const score = Number(req.body.score);

    if (!TARGET_MODELS[targetType] || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'A valid targetType and targetId are required' });
    }
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Score must be a whole number from 1 to 5' });
    }
    if (comment && comment.length > 1000) {
      return res.status(400).json({ message: 'Comment is too long' });
    }

    const target = await TARGET_MODELS[targetType].findById(targetId);
    if (!target) {
      return res.status(404).json({ message: `${targetType === 'expert' ? 'Expert' : 'Organization'} not found` });
    }

    const eligible = await checkEligibility(targetType, targetId, req.user._id);
    if (!eligible) {
      return res.status(403).json({
        message: 'You can rate an expert only after completing a consultation with them',
      });
    }

    const rating = await Rating.findOneAndUpdate(
      { farmerId: req.user._id, targetType, targetId },
      { score, comment: comment || '' },
      { new: true, upsert: true, setDefaultValuesOnInsert: true, runValidators: true }
    );

    const aggregate = await recalculateAggregate(targetType, targetId);

    res.json({ rating, ...aggregate });
  } catch (err) {
    sendError(res, 500, 'Failed to submit rating', err);
  }
};

// DELETE /api/ratings/:id
// To delete the logged-in farmer's own rating
const deleteRating = async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    if (rating.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own rating' });
    }

    const { targetType, targetId } = rating;
    await rating.deleteOne();

    const aggregate = await recalculateAggregate(targetType, targetId);

    res.json({ message: 'Rating deleted', ...aggregate });
  } catch (err) {
    sendError(res, 500, 'Failed to delete rating', err);
  }
};

module.exports = { getRatings, getMyRating, submitRating, deleteRating, recalculateAggregate };
