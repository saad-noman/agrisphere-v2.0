const express = require('express');
const {
  predictCrop,
  getHistory,
  getHistoryById,
  deleteHistory,
} = require('../controllers/farmingRecommendationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/predict', protect, predictCrop);
router.get('/history', protect, getHistory);
router.get('/history/:id', protect, getHistoryById);
router.delete('/history/:id', protect, deleteHistory);

module.exports = router;



