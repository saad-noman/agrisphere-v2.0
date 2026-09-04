const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { upload, verifyImageContent } = require('../middleware/uploadMiddleware');
const {
  listListings,
  getListing,
  getMyListings,
  createListing,
  updateListing,
  closeListing,
  deleteListing,
  expressInterest,
} = require('../controllers/listingController');

// Browsing is open; managing a listing requires a session and ownership
router.get('/', optionalProtect, listListings);
router.get('/mine', protect, getMyListings);
router.get('/:id', optionalProtect, getListing);
router.post('/', protect, upload.single('photo'), verifyImageContent, createListing);
router.put('/:id', protect, upload.single('photo'), verifyImageContent, updateListing);
router.patch('/:id/close', protect, closeListing);
router.delete('/:id', protect, deleteListing);
router.post('/:id/interest', protect, expressInterest);

module.exports = router;
