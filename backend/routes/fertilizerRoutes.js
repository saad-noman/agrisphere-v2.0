const express = require('express');

const router = express.Router();

const {
  getFertilizers,
  createFertilizer,
  getFertilizer,
  updateFertilizer,
  deleteFertilizer,
} = require('../controllers/fertilizerController');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', protect, getFertilizers);

router.get('/:id', protect, getFertilizer);

router.post('/', protect, requireRole('expert'), createFertilizer);

router.put('/:id', protect, requireRole('expert'), updateFertilizer);

router.delete('/:id', protect, requireRole('expert'), deleteFertilizer);

module.exports = router;
