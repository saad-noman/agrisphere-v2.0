const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  getFarmPerformance,
} = require('../controllers/performanceController');

router.get('/performance', protect, getFarmPerformance);

module.exports = router;
