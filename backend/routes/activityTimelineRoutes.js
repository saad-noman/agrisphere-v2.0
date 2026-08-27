const express = require('express');

const router = express.Router();

const {
  getActivityTimeline,
} = require('../controllers/activityTimelineController');

const {
  protect,
} = require('../middleware/authMiddleware');

router.get(
  '/',
  protect,
  getActivityTimeline
);

module.exports = router;
