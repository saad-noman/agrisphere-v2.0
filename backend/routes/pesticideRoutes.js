const express = require('express');

const router = express.Router();

const {
  getPesticides,
  createPesticide,
  getPesticide,
  updatePesticide,
  deletePesticide,
} = require('../controllers/pesticideController');

const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Everyone
router.get('/', protect, getPesticides);
router.get('/:id', protect, getPesticide);

// Experts only
router.post('/', protect, requireRole('expert'), createPesticide);
router.put('/:id', protect, requireRole('expert'), updatePesticide);
router.delete('/:id', protect, requireRole('expert'), deletePesticide);

module.exports = router;
