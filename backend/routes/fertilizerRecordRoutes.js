const express = require('express');

const router = express.Router();

const {
  getFertilizerRecord,
  updateFertilizerRecord,
  deleteFertilizerRecord,
} = require('../controllers/fertilizerController');

const { protect } = require('../middleware/authMiddleware');

router.get('/:id', protect, getFertilizerRecord);

router.put('/:id', protect, updateFertilizerRecord);

router.delete('/:id', protect, deleteFertilizerRecord);

module.exports = router;
