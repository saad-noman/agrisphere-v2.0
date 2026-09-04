const AdvisorySnapshot = require('../models/AdvisorySnapshot');
const { listRegions } = require('../data/bangladeshRegions');
const { listCrops } = require('../data/bdCropProfiles');
const { generateAdvisory } = require('../services/cropIntelligenceService');
const sendError = require('../utils/sendError');

const MAX_WATCHLIST_FIELDS = 25;
const MAX_HISTORY_RECORDS = 200;

/** Two years back is as far as a sowing date can sensibly be. */
function isReasonableSowingDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date >= twoYearsAgo && date <= tomorrow;
}

function validateAdvisoryInput(body) {
  const { divisionId, districtId, cropId, sowingDate } = body || {};
  if (!divisionId || !districtId) return 'Please choose a division and district.';
  if (!cropId) return 'Please choose a crop.';
  if (!sowingDate || !isReasonableSowingDate(sowingDate)) {
    return 'Choose a sowing date within the last two years.';
  }
  return null;
}

// GET /api/crop-intelligence/regions
// Divisions, districts and (where available) upazilas for the location picker
const getRegions = async (req, res) => {
  try {
    res.json({ divisions: listRegions() });
  } catch (err) {
    sendError(res, 500, 'Could not load regions.', err);
  }
};

// GET /api/crop-intelligence/crops
// Crops supported by the advisory engine, with their stage timelines
const getCrops = async (req, res) => {
  try {
    res.json({ crops: listCrops() });
  } catch (err) {
    sendError(res, 500, 'Could not load crops.', err);
  }
};

// POST /api/crop-intelligence/advisory
// Generates (but does not save) an advisory for the supplied field
const createAdvisory = async (req, res) => {
  try {
    const problem = validateAdvisoryInput(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const advisory = await generateAdvisory(req.body);
    res.json(advisory);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    sendError(res, 500, 'Could not prepare the advisory. Please try again.', err);
  }
};

// POST /api/crop-intelligence/history
// Saves the advisory the farmer is looking at, as a point-in-time record
const saveAdvisory = async (req, res) => {
  try {
    const problem = validateAdvisoryInput(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const count = await AdvisorySnapshot.countDocuments({ user: req.user.id, kind: 'advisory' });
    if (count >= MAX_HISTORY_RECORDS) {
      return res.status(400).json({
        message: `You have reached the limit of ${MAX_HISTORY_RECORDS} saved advisories. Delete an older one first.`,
      });
    }

    // Regenerated rather than trusted from the client, so a saved record always
    // reflects what the engine actually produced.
    const advisory = await generateAdvisory(req.body);

    const snapshot = await AdvisorySnapshot.create({
      user: req.user.id,
      kind: 'advisory',
      fieldName: req.body.fieldName,
      crop: req.body.cropRecordId || undefined,
      divisionId: req.body.divisionId,
      districtId: req.body.districtId,
      upazilaId: req.body.upazilaId || null,
      cropId: req.body.cropId,
      sowingDate: req.body.sowingDate,
      areaValue: req.body.areaValue,
      areaUnit: req.body.areaUnit,
      status: advisory.status,
      actionCount: advisory.actionCount,
      dataMode: advisory.dataMode,
      payload: advisory,
    });

    res.status(201).json(snapshot);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    sendError(res, 500, 'Could not save this advisory. Please try again.', err);
  }
};

// GET /api/crop-intelligence/history
// Light list view — the full payload is only sent when a record is opened
const getHistory = async (req, res) => {
  try {
    const records = await AdvisorySnapshot.find({ user: req.user.id, kind: 'advisory' })
      .select('-payload')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(records);
  } catch (err) {
    sendError(res, 500, 'Could not load your saved advisories.', err);
  }
};

// GET /api/crop-intelligence/history/:id
const getHistoryItem = async (req, res) => {
  try {
    const record = await AdvisorySnapshot.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Advisory not found' });
    if (record.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(record);
  } catch (err) {
    sendError(res, 500, 'Could not load this advisory.', err);
  }
};

// DELETE /api/crop-intelligence/history/:id
const deleteHistoryItem = async (req, res) => {
  try {
    const record = await AdvisorySnapshot.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Advisory not found' });
    if (record.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await record.deleteOne();
    res.json({ message: 'Advisory deleted' });
  } catch (err) {
    sendError(res, 500, 'Could not delete this advisory.', err);
  }
};

// POST /api/crop-intelligence/watchlist
// Adds a field to the watchlist. Only inputs are stored — the advisory is
// regenerated on every read so a watched field is never showing stale risk.
const addWatchField = async (req, res) => {
  try {
    const problem = validateAdvisoryInput(req.body);
    if (problem) return res.status(400).json({ message: problem });

    const count = await AdvisorySnapshot.countDocuments({ user: req.user.id, kind: 'watch' });
    if (count >= MAX_WATCHLIST_FIELDS) {
      return res.status(400).json({
        message: `Your watchlist is full (${MAX_WATCHLIST_FIELDS} fields). Remove a field first.`,
      });
    }

    const duplicate = await AdvisorySnapshot.findOne({
      user: req.user.id,
      kind: 'watch',
      districtId: req.body.districtId,
      cropId: req.body.cropId,
      sowingDate: req.body.sowingDate,
    });
    if (duplicate) {
      return res.status(409).json({ message: 'This field is already in your watchlist.' });
    }

    const field = await AdvisorySnapshot.create({
      user: req.user.id,
      kind: 'watch',
      fieldName: req.body.fieldName,
      crop: req.body.cropRecordId || undefined,
      divisionId: req.body.divisionId,
      districtId: req.body.districtId,
      upazilaId: req.body.upazilaId || null,
      cropId: req.body.cropId,
      sowingDate: req.body.sowingDate,
      areaValue: req.body.areaValue,
      areaUnit: req.body.areaUnit,
    });

    res.status(201).json(field);
  } catch (err) {
    sendError(res, 500, 'Could not add this field to your watchlist.', err);
  }
};

// GET /api/crop-intelligence/watchlist
// Returns each watched field with a freshly generated risk summary. One field
// failing to refresh does not take the whole list down.
const getWatchlist = async (req, res) => {
  try {
    const fields = await AdvisorySnapshot.find({ user: req.user.id, kind: 'watch' })
      .select('-payload')
      .sort({ createdAt: -1 });

    const results = await Promise.all(
      fields.map(async (field) => {
        const base = {
          _id: field._id,
          fieldName: field.fieldName,
          divisionId: field.divisionId,
          districtId: field.districtId,
          upazilaId: field.upazilaId,
          cropId: field.cropId,
          sowingDate: field.sowingDate,
          areaValue: field.areaValue,
          areaUnit: field.areaUnit,
          createdAt: field.createdAt,
        };

        try {
          const advisory = await generateAdvisory({
            divisionId: field.divisionId,
            districtId: field.districtId,
            upazilaId: field.upazilaId,
            cropId: field.cropId,
            sowingDate: field.sowingDate,
            areaValue: field.areaValue,
            areaUnit: field.areaUnit,
          });

          return {
            ...base,
            status: advisory.status,
            actionCount: advisory.actionCount,
            dataMode: advisory.dataMode,
            location: advisory.location,
            crop: { id: advisory.crop.id, name: advisory.crop.name },
            stage: advisory.stage,
            topRisks: advisory.risks.slice(0, 3).map((r) => ({
              id: r.id,
              category: r.category,
              severity: r.severity,
              subject: r.subject || null,
              when: r.when,
            })),
          };
        } catch (err) {
          console.error('Watchlist refresh failed for field', field._id.toString(), err.message);
          return { ...base, status: null, refreshFailed: true };
        }
      })
    );

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Could not load your watchlist.', err);
  }
};

// DELETE /api/crop-intelligence/watchlist/:id
const removeWatchField = async (req, res) => {
  try {
    const field = await AdvisorySnapshot.findById(req.params.id);
    if (!field) return res.status(404).json({ message: 'Field not found' });
    if (field.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await field.deleteOne();
    res.json({ message: 'Field removed from watchlist' });
  } catch (err) {
    sendError(res, 500, 'Could not remove this field.', err);
  }
};

module.exports = {
  getRegions,
  getCrops,
  createAdvisory,
  saveAdvisory,
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
  addWatchField,
  getWatchlist,
  removeWatchField,
};
