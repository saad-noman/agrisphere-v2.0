const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listNotifications, markAsRead } = require('../controllers/notificationController');

router.get('/', protect, listNotifications);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
