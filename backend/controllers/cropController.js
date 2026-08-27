const Crop = require('../models/Crop');
const sendError = require('../utils/sendError');


// POST /api/crops
// To create a new crop for the logged-in farmer
const createCrop = async (req, res) => {
  try {
    const crop = await Crop.create({
      ...req.body,
      farmer: req.user.id,
    });

    res.status(201).json(crop);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// GET /api/crops
// To list the logged-in farmer's crops
const getMyCrops = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'farmer') {
      filter.farmer = req.user.id;
    }

    const crops = await Crop.find(filter)
      .sort({ createdAt: -1 });

    res.json(crops);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// GET /api/crops/:cropId
// To get a single crop's details
const getCrop = async (req, res) => {
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

    res.json(crop);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// PUT /api/crops/:cropId
// To update a crop's details
const updateCrop = async (req, res) => {
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

    const updatable = [
      'name', 'cropType', 'variety', 'season', 'area', 'areaUnit',
      'plantingDate', 'expectedHarvestDate', 'location', 'notes', 'status',
    ];
    for (const field of updatable) {
      if (field in req.body) crop[field] = req.body[field];
    }

    await crop.save();

    res.json(crop);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


// DELETE /api/crops/:cropId
// To delete a crop
const deleteCrop = async (req, res) => {
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

    await crop.deleteOne();

    res.json({
      message: 'Crop deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};


module.exports = {
  createCrop,
  getMyCrops,
  getCrop,
  updateCrop,
  deleteCrop,
};
