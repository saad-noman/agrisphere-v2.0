const mongoose = require('mongoose');
const RoadHazard = require('../models/RoadHazard');
const sendError = require('../utils/sendError');

const TYPES = ['waterlogged', 'flooded', 'blocked', 'damaged', 'construction', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];

// Shapes a hazard for the client, including whether the viewer may resolve it
function shapeHazard(hazard, userId, userRole) {
  const reporterId = hazard.reporter ? String(hazard.reporter) : '';
  const viewerId = userId ? String(userId) : '';

  let confirmedByMe = false;
  const confirmations = hazard.confirmations || [];
  for (let i = 0; i < confirmations.length; i++) {
    if (String(confirmations[i]) === viewerId) {
      confirmedByMe = true;
      break;
    }
  }

  const isReporter = Boolean(viewerId) && reporterId === viewerId;
  const isAdmin = userRole === 'admin';

  return {
    _id: hazard._id,
    type: hazard.type,
    severity: hazard.severity,
    latitude: hazard.latitude,
    longitude: hazard.longitude,
    description: hazard.description || '',
    status: hazard.status,
    confirmationCount: confirmations.length,
    confirmedByMe,
    canResolve: isReporter || isAdmin,
    createdAt: hazard.createdAt,
  };
}

// POST /api/road-hazards
const createHazard = async (req, res) => {
  try {
    const type = String(req.body.type || '').trim();
    const severity = String(req.body.severity || 'medium').trim();
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!TYPES.includes(type)) {
      return res.status(400).json({ message: 'Please choose a valid hazard type' });
    }

    if (!SEVERITIES.includes(severity)) {
      return res.status(400).json({ message: 'Please choose a valid severity' });
    }

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ message: 'A valid latitude is required' });
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'A valid longitude is required' });
    }

    const hazard = await RoadHazard.create({
      reporter: req.user._id,
      type,
      severity,
      latitude,
      longitude,
      description: String(req.body.description || '').trim().slice(0, 300),
    });

    res.status(201).json(shapeHazard(hazard, req.user._id, req.user.role));
  } catch (err) {
    sendError(res, 500, 'Failed to report the road condition', err);
  }
};

// GET /api/road-hazards
// Lists active hazards, optionally limited to a map bounding box
const listHazards = async (req, res) => {
  try {
    const filter = { status: 'active' };

    const minLat = Number(req.query.minLat);
    const maxLat = Number(req.query.maxLat);
    const minLng = Number(req.query.minLng);
    const maxLng = Number(req.query.maxLng);

    const hasBox =
      Number.isFinite(minLat) && Number.isFinite(maxLat) &&
      Number.isFinite(minLng) && Number.isFinite(maxLng);

    if (hasBox) {
      filter.latitude = { $gte: minLat, $lte: maxLat };
      filter.longitude = { $gte: minLng, $lte: maxLng };
    }

    const hazards = await RoadHazard.find(filter).sort({ createdAt: -1 }).limit(300).lean();

    const viewerId = req.user ? req.user._id : null;
    const viewerRole = req.user ? req.user.role : null;

    const results = [];
    for (let i = 0; i < hazards.length; i++) {
      results.push(shapeHazard(hazards[i], viewerId, viewerRole));
    }

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Failed to load road conditions', err);
  }
};

// PATCH /api/road-hazards/:id/confirm
// Lets another user vouch that the hazard is real
const confirmHazard = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid hazard id' });
    }

    const hazard = await RoadHazard.findById(req.params.id);
    if (!hazard) {
      return res.status(404).json({ message: 'Road condition not found' });
    }

    let alreadyConfirmed = false;
    for (let i = 0; i < hazard.confirmations.length; i++) {
      if (hazard.confirmations[i].toString() === req.user._id.toString()) {
        alreadyConfirmed = true;
        break;
      }
    }

    if (!alreadyConfirmed) {
      hazard.confirmations.push(req.user._id);
      await hazard.save();
    }

    res.json(shapeHazard(hazard, req.user._id, req.user.role));
  } catch (err) {
    sendError(res, 500, 'Failed to confirm the road condition', err);
  }
};

// PATCH /api/road-hazards/:id/resolve
// Only the original reporter or an admin can close a report
const resolveHazard = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid hazard id' });
    }

    const hazard = await RoadHazard.findById(req.params.id);
    if (!hazard) {
      return res.status(404).json({ message: 'Road condition not found' });
    }

    const isReporter = hazard.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({ message: 'Only the reporter can mark this resolved' });
    }

    hazard.status = 'resolved';
    await hazard.save();

    res.json(shapeHazard(hazard, req.user._id, req.user.role));
  } catch (err) {
    sendError(res, 500, 'Failed to update the road condition', err);
  }
};

module.exports = { createHazard, listHazards, confirmHazard, resolveHazard };
