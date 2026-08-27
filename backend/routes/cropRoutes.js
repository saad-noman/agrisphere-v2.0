const express = require('express');

const router = express.Router();

const {
  createCrop,
  getMyCrops,
  getCrop,
  updateCrop,
  deleteCrop,
} = require('../controllers/cropController');

const {
  createProductionRecord,
  getProductionRecords,
} = require('../controllers/productionController');

const {
  createFertilizerRecord,
  getFertilizerRecords,
} = require('../controllers/fertilizerController');

const {
  createPesticideRecord,
  getPesticideRecords,
} = require('../controllers/pesticideController');

const { protect } = require('../middleware/authMiddleware');

const {
  getCropPerformance,
} = require('../controllers/performanceController');

router.post('/', protect, createCrop);

router.get('/', protect, getMyCrops);

router.get('/:cropId/pesticides',protect, getPesticideRecords);

router.post( '/:cropId/pesticides', protect, createPesticideRecord);

router.get( '/:cropId/fertilizers', protect, getFertilizerRecords);

router.post('/:cropId/fertilizers', protect, createFertilizerRecord);

router.get( '/:cropId/production', protect, getProductionRecords);

router.post( '/:cropId/production', protect, createProductionRecord);

router.get('/:cropId/performance', protect, getCropPerformance);

router.get('/:cropId', protect, getCrop);

router.put('/:cropId', protect, updateCrop);

router.delete('/:cropId', protect, deleteCrop);

module.exports = router;
