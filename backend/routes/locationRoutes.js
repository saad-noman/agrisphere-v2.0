const express = require('express');
const router = express.Router();
const { getLocationOptions } = require('../controllers/locationController');

// GET /api/locations/options
router.get('/options', getLocationOptions);

module.exports = router;
