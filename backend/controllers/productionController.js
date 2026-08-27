const Crop = require('../models/Crop');
const ProductionRecord = require('../models/ProductionRecord');
const sendError = require('../utils/sendError');


// POST /api/crops/:cropId/production
// To record a production/harvest entry for a crop
const createProductionRecord = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);

    if (!crop) {
      return res.status(404).json({
        message: 'Crop not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const { quantity, unit, harvestDate, quality, notes } = req.body;
    const record = await ProductionRecord.create({
      crop: crop._id,
      quantity,
      unit,
      harvestDate,
      quality,
      notes,
    });

    res.status(201).json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// GET /api/crops/:cropId/production
// To list a crop's production records
const getProductionRecords = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.cropId);

    if (!crop) {
      return res.status(404).json({
        message: 'Crop not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const records = await ProductionRecord.find({
      crop: crop._id,
    }).sort({
      harvestDate: -1,
    });

    res.json(records);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// GET /api/production/:id
// To get a single production record
const getProductionRecord = async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id)
      .populate('crop');

    if (!record) {
      return res.status(404).json({
        message: 'Production record not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      record.crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    res.json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// PUT /api/production/:id
// To update a production record
const updateProductionRecord = async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id)
      .populate('crop');

    if (!record) {
      return res.status(404).json({
        message: 'Production record not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      record.crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const updatable = ['quantity', 'unit', 'harvestDate', 'quality', 'notes'];
    for (const field of updatable) {
      if (field in req.body) record[field] = req.body[field];
    }

    await record.save();

    res.json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// DELETE /api/production/:id
// To delete a production record
const deleteProductionRecord = async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id)
      .populate('crop');

    if (!record) {
      return res.status(404).json({
        message: 'Production record not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      record.crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    await record.deleteOne();

    res.json({
      message: 'Production record deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


module.exports = {
  createProductionRecord,
  getProductionRecords,
  getProductionRecord,
  updateProductionRecord,
  deleteProductionRecord,
};
