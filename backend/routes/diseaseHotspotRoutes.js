const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { getHotspots, runHotspotAlerts } = require('../controllers/diseaseHotspotController');

// GET /api/disease-hotspots
router.get('/', optionalProtect, getHotspots);
router.post('/alerts', protect, runHotspotAlerts);

module.exports = router;
