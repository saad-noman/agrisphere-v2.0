const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { cropAnalysisUpload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  detectDisease,
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
} = require('../controllers/cropAnalysisController');

router.post('/detect-disease', protect, cropAnalysisUpload.single('image'), verifyImageContent, detectDisease);
router.get('/history', protect, getHistory);
router.get('/history/:id', protect, getHistoryItem);
router.delete('/history/:id', protect, deleteHistoryItem);

module.exports = router;
