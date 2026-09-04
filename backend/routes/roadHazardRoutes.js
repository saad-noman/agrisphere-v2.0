const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  createHazard,
  listHazards,
  confirmHazard,
  resolveHazard,
} = require('../controllers/roadHazardController');

// Anyone can see active hazards; reporting and updating needs a session
router.get('/', optionalProtect, listHazards);
router.post('/', protect, createHazard);
router.patch('/:id/confirm', protect, confirmHazard);
router.patch('/:id/resolve', protect, resolveHazard);

module.exports = router;
