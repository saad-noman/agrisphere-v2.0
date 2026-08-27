const Crop = require('../models/Crop');
const Fertilizer = require('../models/Fertilizer');
const FertilizerRecord = require('../models/FertilizerRecord');
const sendError = require('../utils/sendError');

// POST /api/crops/:cropId/fertilizers
// To record a fertilizer application on a crop
const createFertilizerRecord = async (req, res) => {
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

    const { fertilizer, amount, unit, applicationDate, notes } = req.body;
    const record = await FertilizerRecord.create({
      crop: crop._id,
      fertilizer,
      amount,
      unit,
      applicationDate,
      notes,
    });

    res.status(201).json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/crops/:cropId/fertilizers
// To list a crop's fertilizer application records
const getFertilizerRecords = async (req, res) => {
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

    const records = await FertilizerRecord.find({
      crop: crop._id,
    })
      .populate('fertilizer')
      .sort({
        applicationDate: -1,
      })

    res.json(records);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/fertilizer-records/:id
// To get a single fertilizer application record
const getFertilizerRecord = async (req, res) => {
  try {
    const record = await FertilizerRecord.findById(req.params.id)
      .populate('crop')
      .populate('fertilizer');

    if (!record) {
      return res.status(404).json({
        message: 'Fertilizer record not found',
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

// PUT /api/fertilizer-records/:id
// To update a fertilizer application record
const updateFertilizerRecord = async (req, res) => {
  try {
    const record = await FertilizerRecord.findById(req.params.id)
      .populate('crop')
      .populate('fertilizer');

    if (!record) {
      return res.status(404).json({
        message: 'Fertilizer record not found',
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

    const updatable = ['amount', 'unit', 'applicationDate', 'notes'];
    for (const field of updatable) {
      if (field in req.body) record[field] = req.body[field];
    }

    await record.save();

    res.json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/fertilizer-records/:id
// To delete a fertilizer application record
const deleteFertilizerRecord = async (req, res) => {
  try {
    const record = await FertilizerRecord.findById(req.params.id)
      .populate('crop')
      .populate('fertilizer');

    if (!record) {
      return res.status(404).json({
        message: 'Fertilizer record not found',
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
      message: 'Fertilizer record deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/fertilizers
// To list the fertilizer catalog
const getFertilizers = async (req, res) => {
  try {
    const fertilizers = await Fertilizer.find().sort({ name: 1 });

    res.json(fertilizers);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// POST /api/fertilizers
// To add a new fertilizer to the catalog
const createFertilizer = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    const exists = await Fertilizer.findOne({ name });

    if (exists) {
      return res.status(400).json({
        message: 'Fertilizer already exists',
      });
    }

    const fertilizer = await Fertilizer.create({
      name,
      category,
      description,
    });

    res.status(201).json(fertilizer);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/fertilizers/:id
// To get a single fertilizer by id
const getFertilizer = async (req, res) => {
  try {
    const fertilizer = await Fertilizer.findById(req.params.id);

    if (!fertilizer) {
      return res.status(404).json({
        message: 'Fertilizer not found',
      });
    }

    res.json(fertilizer);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// PUT /api/fertilizers/:id
// To update a fertilizer in the catalog
const updateFertilizer = async (req, res) => {
  try {
    const fertilizer = await Fertilizer.findById(req.params.id);

    if (!fertilizer) {
      return res.status(404).json({
        message: 'Fertilizer not found',
      });
    }

    const updatable = ['name', 'category', 'description'];
    for (const field of updatable) {
      if (field in req.body) fertilizer[field] = req.body[field];
    }

    await fertilizer.save();

    res.json(fertilizer);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/fertilizers/:id
// To delete a fertilizer from the catalog
const deleteFertilizer = async (req, res) => {
  try {
    const fertilizer = await Fertilizer.findById(req.params.id);

    if (!fertilizer) {
      return res.status(404).json({
        message: 'Fertilizer not found',
      });
    }

    await fertilizer.deleteOne();

    res.json({
      message: 'Fertilizer deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

module.exports = {
  getFertilizers,
  createFertilizer,
  getFertilizer,
  updateFertilizer,
  deleteFertilizer,

  createFertilizerRecord,
  getFertilizerRecords,
  getFertilizerRecord,
  updateFertilizerRecord,
  deleteFertilizerRecord,
};
