const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  getRegions,
  getCrops,
  createAdvisory,
  saveAdvisory,
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
  addWatchField,
  getWatchlist,
  removeWatchField,
} = require('../controllers/cropIntelligenceController');

// Reference data is public so a visitor can explore the module before signing
// up — the location and crop pickers work without an account.
router.get('/regions', getRegions);
router.get('/crops', getCrops);

// Generating an advisory is also open: it is the product's shop window, and it
// touches no personal data. Saving anything requires an account.
router.post('/advisory', createAdvisory);

router.get('/history', protect, getHistory);
router.post('/history', protect, saveAdvisory);
router.get('/history/:id', protect, getHistoryItem);
router.delete('/history/:id', protect, deleteHistoryItem);

router.get('/watchlist', protect, getWatchlist);
router.post('/watchlist', protect, addWatchField);
router.delete('/watchlist/:id', protect, removeWatchField);

module.exports = router;
