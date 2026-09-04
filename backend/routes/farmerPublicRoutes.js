const express = require('express');
const router = express.Router();
const { listPublicFarmers, getPublicFarmer } = require('../controllers/farmerPublicController');

// Public marketplace seller directory. Open on purpose — only safe fields
// are returned and only for farmers who opted in.
router.get('/public', listPublicFarmers);
router.get('/:id/public', getPublicFarmer);

module.exports = router;
