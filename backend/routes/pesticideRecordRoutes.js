const express = require('express');

const router = express.Router();

const {
  getPesticideRecord,
  updatePesticideRecord,
  deletePesticideRecord,
} = require('../controllers/pesticideController');

const { protect } = require('../middleware/authMiddleware');

router.get('/:id', protect, getPesticideRecord);

router.put('/:id', protect, updatePesticideRecord);

router.delete('/:id', protect, deletePesticideRecord);

module.exports = router;
