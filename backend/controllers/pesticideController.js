const Crop = require('../models/Crop');
const Pesticide = require('../models/Pesticide');
const PesticideRecord = require('../models/PesticideRecord');
const sendError = require('../utils/sendError');

// GET /api/pesticides
// To list the pesticide catalog
const getPesticides = async (req, res) => {
  try {
    const pesticides = await Pesticide.find().sort({ name: 1 });

    res.json(pesticides);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// POST /api/pesticides
// To add a new pesticide to the catalog
const createPesticide = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    const exists = await Pesticide.findOne({ name });

    if (exists) {
      return res.status(400).json({
        message: 'Pesticide already exists',
      });
    }

    const pesticide = await Pesticide.create({
      name,
      category,
      description,
    });

    res.status(201).json(pesticide);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/pesticides/:id
// To get a single pesticide by id
const getPesticide = async (req, res) => {
  try {
    const pesticide = await Pesticide.findById(req.params.id);

    if (!pesticide) {
      return res.status(404).json({
        message: 'Pesticide not found',
      });
    }

    res.json(pesticide);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// PUT /api/pesticides/:id
// To update a pesticide in the catalog
const updatePesticide = async (req, res) => {
  try {
    const pesticide = await Pesticide.findById(req.params.id);

    if (!pesticide) {
      return res.status(404).json({
        message: 'Pesticide not found',
      });
    }

    const updatable = ['name', 'category', 'description'];
    for (const field of updatable) {
      if (field in req.body) pesticide[field] = req.body[field];
    }

    await pesticide.save();

    res.json(pesticide);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/pesticides/:id
// To delete a pesticide from the catalog
const deletePesticide = async (req, res) => {
  try {
    const pesticide = await Pesticide.findById(req.params.id);

    if (!pesticide) {
      return res.status(404).json({
        message: 'Pesticide not found',
      });
    }

    await pesticide.deleteOne();

    res.json({
      message: 'Pesticide deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// POST /api/crops/:cropId/pesticides
// To record a pesticide application on a crop
const createPesticideRecord = async (req, res) => {
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

    const { pesticide, amount, unit, applicationDate, targetPest, notes } = req.body;
    const record = await PesticideRecord.create({
      crop: crop._id,
      pesticide,
      amount,
      unit,
      applicationDate,
      targetPest,
      notes,
    });

    res.status(201).json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/crops/:cropId/pesticides
// To list a crop's pesticide application records
const getPesticideRecords = async (req, res) => {
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

    const records = await PesticideRecord.find({
      crop: crop._id,
    })
      .populate('pesticide')
      .sort({ applicationDate: -1 });

    res.json(records);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/pesticide-records/:id
// To get a single pesticide application record
const getPesticideRecord = async (req, res) => {
  try {
    const record = await PesticideRecord.findById(req.params.id)
      .populate('crop')
      .populate('pesticide');

    if (!record) {
      return res.status(404).json({
        message: 'Pesticide record not found',
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

// PUT /api/pesticide-records/:id
// To update a pesticide application record
const updatePesticideRecord = async (req, res) => {
  try {
    const record = await PesticideRecord.findById(req.params.id)
      .populate('crop');

    if (!record) {
      return res.status(404).json({
        message: 'Pesticide record not found',
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

    const updatable = ['amount', 'unit', 'applicationDate', 'targetPest', 'notes'];
    for (const field of updatable) {
      if (field in req.body) record[field] = req.body[field];
    }

    await record.save();

    res.json(record);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/pesticide-records/:id
// To delete a pesticide application record
const deletePesticideRecord = async (req, res) => {
  try {
    const record = await PesticideRecord.findById(req.params.id)
      .populate('crop');

    if (!record) {
      return res.status(404).json({
        message: 'Pesticide record not found',
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
      message: 'Pesticide record deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

module.exports = {
  getPesticides,
  createPesticide,
  getPesticide,
  updatePesticide,
  deletePesticide,

  createPesticideRecord,
  getPesticideRecords,
  getPesticideRecord,
  updatePesticideRecord,
  deletePesticideRecord,
};
