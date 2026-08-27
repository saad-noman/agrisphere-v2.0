const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getRatings, getMyRating, submitRating, deleteRating } = require('../controllers/ratingController');

router.get('/', getRatings);
router.get('/mine', protect, authorize('farmer'), getMyRating);
router.post('/', protect, authorize('farmer'), submitRating);
router.delete('/:id', protect, authorize('farmer'), deleteRating);

module.exports = router;
